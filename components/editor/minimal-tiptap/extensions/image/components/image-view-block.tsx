import * as React from "react"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from '@tiptap/core';
import { cn } from '@/lib/utils';
// Removed unused imports to clean up the code
import { getSignedUrl } from '@/lib/supabase/storage-utils';
import { ElementDimensions } from '../hooks/use-drag-resize';
import { useDragResize } from '../hooks/use-drag-resize';
import { ResizeHandle } from './resize-handle';
import { Controlled as ControlledZoom } from "react-medium-image-zoom"
import { ActionButton, ActionWrapper, ImageActions } from "./image-actions"
import { useImageActions } from "../hooks/use-image-actions"
import { blobUrlToBase64 } from "../../../utils"
import { InfoCircledIcon, TrashIcon } from "@radix-ui/react-icons"
import { Spinner } from "../../../components/spinner"
import type { UploadReturnType } from "../image"
// Removed unused import
import { getCachedImageFile, cacheImageFile } from "../../../utils/file-cache"

const MAX_HEIGHT = 600
const MIN_HEIGHT = 120
const MIN_WIDTH = 120

// Global, lightweight detection for recent undo to tailor image recovery flow
let __lastUndoAt = 0
declare global {
  interface Window { __imageViewUndoListenerAttached?: boolean }
}
if (typeof window !== 'undefined' && !window.__imageViewUndoListenerAttached) {
  window.__imageViewUndoListenerAttached = true
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const isUndo = (e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey
    if (isUndo) {
      __lastUndoAt = Date.now()
    }
  }, { capture: true })
}

interface ImageState {
  src: string
  isServerUploading: boolean
  imageLoaded: boolean
  isZoomed: boolean
  error: boolean
  naturalSize: ElementDimensions
}

const normalizeUploadResponse = (res: UploadReturnType) => ({
  src: typeof res === "string" ? res : res.src,
})

export const ImageViewBlock: React.FC<NodeViewProps> = ({
  editor,
  node,
  selected,
  updateAttributes,
  getPos,
}) => {
  const {
    src: initialSrc,
    width: initialWidth,
    height: initialHeight,
    fileName,
  } = node.attrs
  const uploadAttemptedRef = React.useRef(false)
  const editorRef = React.useRef(editor)
  React.useEffect(() => {
    editorRef.current = editor
  }, [editor])
  const getPosRef = React.useRef(getPos)
  React.useEffect(() => {
    getPosRef.current = getPos
  }, [getPos])

  const initSrc = React.useMemo(() => {
    if (typeof initialSrc === "string") {
      return initialSrc
    }
    return initialSrc.src
  }, [initialSrc])

  const [imageState, setImageState] = React.useState<ImageState>({
    src: initSrc,
    isServerUploading: false,
    imageLoaded: false,
    isZoomed: false,
    error: false,
    naturalSize: { width: initialWidth, height: initialHeight },
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const MAX_RETRIES = 1;
  const recoveryAttemptedRef = React.useRef(false);
  
  // Get the storage path from node attributes or fall back to src if not available
  const storagePath = node.attrs['data-storage-path'] || node.attrs.src;
  const uploadComplete = node.attrs['data-upload-complete'] === 'true' || node.attrs['data-upload-complete'] === true;
  const attrId = node.attrs?.id as string | number | undefined;
  const uploadId = node.attrs?.['data-upload-id'] as string | number | undefined;
  
  // State for the image URL - start with empty to prevent initial load with local path
  const [imageUrl, setImageUrl] = React.useState<string>('');
  
  // Clean up the storage path to remove any query parameters or fragments
  const cleanStoragePath = (path: string): string => {
    if (!path) return '';
    // If it's a blob URL, return it as is
    if (path.startsWith('blob:')) return path;
    // If it's a data URL, return it as is
    if (path.startsWith('data:')) return path;
    // If it's already a full URL (http/https), return it as is
    if (path.startsWith('http')) return path;
    // If it looks like a local path, return empty string
    if (path.includes('/notes/') || path.includes('localhost:3000/notes/')) return '';
    // Remove any query parameters or fragments
    return path.split('?')[0].split('#')[0];
  };
  
  const cleanPath = storagePath ? cleanStoragePath(storagePath) : '';

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    const loadImage = async () => {
      // If we have a blob URL, use it directly (temporary until upload completes)
      if (cleanPath.startsWith('blob:')) {
        if (isMounted) {
          setImageUrl(cleanPath);
          setIsLoading(false);
        }
        return;
      }
      
      // Skip if we don't have a valid storage path
      if (!cleanPath) {
        if (isMounted) setIsLoading(false);
        return;
      }
      
      // If we have a storage path but upload isn't complete, don't try to generate a signed URL yet
      if (!uploadComplete) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // If it's already a full or data URL, use it directly
      if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) {
        if (isMounted) {
          setImageUrl(cleanPath);
          setImageState(prev => ({ ...prev, error: false }));
          setIsLoading(false);
        }
        return;
      }
      // During an immediate undo, prefer cache-first to avoid transient 400s from signing
      const isRecentUndo = Date.now() - __lastUndoAt < 1200
      if (isRecentUndo) {
        const imageExtension = editorRef.current?.options.extensions.find((ext) => ext.name === 'image');
        const { uploadFn } = (imageExtension?.options ?? {}) as { uploadFn?: (file: File) => Promise<UploadReturnType> };
        if (uploadFn) {
          const keys: string[] = [];
          if (attrId != null) keys.push(String(attrId));
          if (uploadId != null) keys.push(String(uploadId));
          if (cleanPath) keys.push(cleanPath);
          for (const key of keys) {
            const cached = getCachedImageFile(key);
            if (!cached) continue;
            try {
              const res = await uploadFn(cached);
              const finalUrl = typeof res === 'string' ? res : res.src;
              if (!finalUrl) continue;
              const isAbs = finalUrl.startsWith('http') || finalUrl.startsWith('data:') || finalUrl.startsWith('blob:');
              if (isMounted) {
                if (isAbs) setImageUrl(finalUrl);
                setImageState(prev => ({ ...prev, error: false }));
              }
              // Non-historic node update
              editorRef.current?.commands.command(({ tr }) => {
                const pos = typeof getPosRef.current === 'function' ? getPosRef.current() : null;
                if (typeof pos === 'number') {
                  const nodeAt = tr.doc.nodeAt(pos);
                  tr.setMeta('addToHistory', false);
                  tr.setNodeMarkup(pos, undefined, {
                    ...nodeAt?.attrs,
                    src: finalUrl,
                    'data-upload-complete': 'true',
                    'data-storage-path': isAbs ? null : finalUrl,
                  });
                  return true;
                }
                return false;
              });
              if (!isAbs) {
                void cacheImageFile(finalUrl, cached);
              }
              return; // Skip signing on successful recovery
            } catch {
              // try next key
            }
          }
        }
        // If cache-based recovery failed, continue to signing below
      }
      
      const getSignedImageUrl = async (retry = 0): Promise<string | null> => {
        try {
          // Validate the path has a file extension
          if (!cleanPath.includes('.')) {
            throw new Error('Invalid file path: missing file extension');
          }
          
          // Get signed URL for private bucket access
          const signedUrl = await getSignedUrl(cleanPath, { expiresIn: 3600 });
          
          if (!signedUrl) {
            return null;
          }
          return signedUrl;
          
        } catch {
          // Reduce noise; will fall back to cache if possible
          if (retry < MAX_RETRIES - 1) {
            // Wait before retrying (exponential backoff)
            const delay = 1000 * Math.pow(2, retry);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getSignedImageUrl(retry + 1);
          }
          return null;
        }
      };
      
      try {
        const url = await getSignedImageUrl(0);
        if (isMounted && url) {
          setImageUrl(url);
          setImageState(prev => ({ ...prev, error: false }));
        } else if (isMounted) {
          // Signed URL unavailable; attempt recovery by re-uploading from cache
          const imageExtension = editorRef.current?.options.extensions.find((ext) => ext.name === 'image');
          const { uploadFn } = (imageExtension?.options ?? {}) as { uploadFn?: (file: File) => Promise<UploadReturnType> };
          if (uploadFn) {
            const keys: string[] = [];
            if (attrId != null) keys.push(String(attrId));
            if (uploadId != null) keys.push(String(uploadId));
            if (cleanPath) keys.push(cleanPath);
            let recovered = false;
            for (const key of keys) {
              const cached = getCachedImageFile(key);
              if (!cached) continue;
              try {
                const res = await uploadFn(cached);
                const finalUrl = typeof res === 'string' ? res : res.src;
                if (!finalUrl) continue;
                const isAbs = finalUrl.startsWith('http') || finalUrl.startsWith('data:') || finalUrl.startsWith('blob:');
                if (isAbs) setImageUrl(finalUrl);
                setImageState(prev => ({ ...prev, error: false }));
                // Non-historic node update
                editorRef.current?.commands.command(({ tr }) => {
                  const pos = typeof getPosRef.current === 'function' ? getPosRef.current() : null;
                  if (typeof pos === 'number') {
                    const nodeAt = tr.doc.nodeAt(pos);
                    tr.setMeta('addToHistory', false);
                    tr.setNodeMarkup(pos, undefined, {
                      ...nodeAt?.attrs,
                      src: finalUrl,
                      'data-upload-complete': 'true',
                      'data-storage-path': isAbs ? null : finalUrl,
                    });
                    return true;
                  }
                  return false;
                });
                // Cache under storage path for future undo recovery
                if (!isAbs) {
                  void cacheImageFile(finalUrl, cached);
                }
                recovered = true;
                break;
              } catch {
                // try next key
              }
            }
            if (!recovered) {
              setImageState(prev => ({ ...prev, error: true }));
            }
          } else {
            setImageState(prev => ({ ...prev, error: true }));
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [cleanPath, uploadComplete, attrId, uploadId]);

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [activeResizeHandle, setActiveResizeHandle] = React.useState<
    "left" | "right" | null
  >(null)

  const onDimensionsChange = React.useCallback(
    ({ width, height }: ElementDimensions) => {
      updateAttributes({ width, height })
    },
    [updateAttributes]
  )

  const aspectRatio =
    imageState.naturalSize.width / imageState.naturalSize.height
  const maxWidth = MAX_HEIGHT * aspectRatio
  const containerMaxWidth = containerRef.current
    ? parseFloat(
        getComputedStyle(containerRef.current).getPropertyValue(
          "--editor-width"
        )
      )
    : Infinity

  const { isLink, onView, onDownload, onCopy, onCopyLink, onRemoveImg } =
    useImageActions({
      editor,
      node,
      src: imageState.src,
      onViewClick: (isZoomed) =>
        setImageState((prev) => ({ ...prev, isZoomed })),
    })

  const {
    currentWidth,
    currentHeight,
    updateDimensions,
    initiateResize,
    isResizing,
  } = useDragResize({
    initialWidth: initialWidth ?? imageState.naturalSize.width,
    initialHeight: initialHeight ?? imageState.naturalSize.height,
    contentWidth: imageState.naturalSize.width,
    contentHeight: imageState.naturalSize.height,
    gridInterval: 0.1,
    onDimensionsChange,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    maxWidth: containerMaxWidth > 0 ? containerMaxWidth : maxWidth,
  })

  const shouldMerge = React.useMemo(() => currentWidth <= 180, [currentWidth])

  const handleImageLoad = React.useCallback(
    (ev: React.SyntheticEvent<HTMLImageElement>) => {
      const img = ev.target as HTMLImageElement
      const newNaturalSize = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      }
      setImageState((prev) => ({
        ...prev,
        naturalSize: newNaturalSize,
        imageLoaded: true,
      }))
      // Ensure loading overlay disappears once the image is fully loaded
      setIsLoading(false)
      // Non-historic auto-attribute update
      editor.commands.command(({ tr }) => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (typeof pos === 'number') {
          const nodeAt = tr.doc.nodeAt(pos);
          tr.setMeta('addToHistory', false);
          const nextWidth = img.width || newNaturalSize.width;
          const nextHeight = img.height || newNaturalSize.height;
          const cur = nodeAt?.attrs || {};
          const shouldUpdate =
            cur.width !== nextWidth ||
            cur.height !== nextHeight ||
            cur.alt !== img.alt ||
            cur.title !== img.title;
          if (shouldUpdate) {
            tr.setNodeMarkup(pos, undefined, {
              ...nodeAt?.attrs,
              width: nextWidth,
              height: nextHeight,
              alt: img.alt,
              title: img.title,
            });
            return true;
          }
          return false;
        }
        return false;
      })

      if (!initialWidth) {
        updateDimensions((state) => ({ ...state, width: newNaturalSize.width }))
      }
    },
    [initialWidth, editor, getPos, updateDimensions]
  )

  const handleImageError = React.useCallback(async () => {
    // Avoid repeated recoveries
    if (!recoveryAttemptedRef.current) {
      recoveryAttemptedRef.current = true;
      try {
        const keys: string[] = [];
        if (attrId != null) keys.push(String(attrId));
        if (uploadId != null) keys.push(String(uploadId));
        if (cleanPath) keys.push(cleanPath);
        const imageExtension = editorRef.current?.options.extensions.find((ext) => ext.name === 'image');
        const { uploadFn } = (imageExtension?.options ?? {}) as { uploadFn?: (file: File) => Promise<UploadReturnType> };
        if (uploadFn) {
          for (const key of keys) {
            const cached = getCachedImageFile(key);
            if (!cached) continue;
            try {
              setIsLoading(true);
              const res = await uploadFn(cached);
              const finalUrl = typeof res === 'string' ? res : res.src;
              if (!finalUrl) continue;
              const isAbs = finalUrl.startsWith('http') || finalUrl.startsWith('data:') || finalUrl.startsWith('blob:');
              setImageState((prev) => ({ ...prev, error: false }));
              if (isAbs) {
                setImageUrl(finalUrl);
              }
              // Update node non-historically
              editorRef.current?.commands.command(({ tr }) => {
                const pos = typeof getPosRef.current === 'function' ? getPosRef.current() : null;
                if (typeof pos === 'number') {
                  const nodeAt = tr.doc.nodeAt(pos);
                  tr.setMeta('addToHistory', false);
                  tr.setNodeMarkup(pos, undefined, {
                    ...nodeAt?.attrs,
                    src: finalUrl,
                    'data-upload-complete': 'true',
                    'data-storage-path': isAbs ? null : finalUrl,
                  });
                  return true;
                }
                return false;
              });
              // Let onLoad (for absolute URLs) or the signing effect (for storage paths) clear the loader
              return;
            } catch {
              // try next key
            }
          }
        }
      } catch {
        // ignore
      }
    }

    setImageState((prev) => ({ ...prev, error: true }));
    // Ensure we don't keep the loading overlay on error
    setIsLoading(false)
  }, [cleanPath, attrId, uploadId])

  const handleResizeStart = React.useCallback(
    (direction: "left" | "right") =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        setActiveResizeHandle(direction)
        initiateResize(direction)(event)
      },
    [initiateResize]
  )

  const handleResizeEnd = React.useCallback(() => {
    setActiveResizeHandle(null)
  }, [])

  React.useEffect(() => {
    if (!isResizing) {
      handleResizeEnd()
    }
  }, [isResizing, handleResizeEnd])

  React.useEffect(() => {
    const handleImage = async () => {
      if (!initSrc.startsWith("blob:") || uploadAttemptedRef.current) {
        return
      }

      uploadAttemptedRef.current = true
      const imageExtension = editor.options.extensions.find(
        (ext) => ext.name === "image"
      )
      const { uploadFn } = imageExtension?.options ?? {}

      if (!uploadFn) {
        try {
          const base64 = await blobUrlToBase64(initSrc)
          setImageState((prev) => ({ ...prev, src: base64 }))
          // Non-historic src update
          editor.commands.command(({ tr }) => {
            const pos = typeof getPos === 'function' ? getPos() : null;
            if (typeof pos === 'number') {
              const nodeAt = tr.doc.nodeAt(pos);
              tr.setMeta('addToHistory', false);
              tr.setNodeMarkup(pos, undefined, { ...nodeAt?.attrs, src: base64, 'data-upload-complete': 'true', 'data-storage-path': null });
              return true;
            }
            return false;
          })
        } catch {
          setImageState((prev) => ({ ...prev, error: true }))
        }
        return
      }

      try {
        setImageState((prev) => ({ ...prev, isServerUploading: true }))
        const response = await fetch(initSrc)
        const blob = await response.blob()
        const file = new File([blob], fileName, { type: blob.type })

        const url = await uploadFn(file, editor)
        const normalizedData = normalizeUploadResponse(url)
        const finalUrl = normalizedData.src

        setImageState((prev) => ({
          ...prev,
          ...normalizedData,
          isServerUploading: false,
        }))

        // Cache under storage path for future undo recovery if not absolute
        {
          const isAbs = finalUrl.startsWith('http') || finalUrl.startsWith('data:') || finalUrl.startsWith('blob:');
          if (!isAbs) {
            void cacheImageFile(finalUrl, file);
          } else {
            // Set imageUrl immediately for absolute URLs
            setImageUrl(finalUrl);
          }
        }

        // Non-historic node update after upload
        editor.commands.command(({ tr }) => {
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (typeof pos === 'number') {
            const nodeAt = tr.doc.nodeAt(pos);
            tr.setMeta('addToHistory', false);
            const isAbs = finalUrl.startsWith('http') || finalUrl.startsWith('data:') || finalUrl.startsWith('blob:');
            tr.setNodeMarkup(pos, undefined, {
              ...nodeAt?.attrs,
              ...normalizedData,
              'data-upload-complete': 'true',
              'data-storage-path': isAbs ? null : finalUrl,
            });
            return true;
          }
          return false;
        })
      } catch (error) {
        console.error('Error uploading image:', error);
        setImageState(prev => ({
          ...prev,
          error: true,
          isServerUploading: false,
        }));
      }
    }

    handleImage()
  }, [editor, fileName, initSrc, updateAttributes, getPos])

  const shouldRenderImage = Boolean(imageUrl) && !imageState.error;

  return (
    <NodeViewWrapper
      ref={containerRef}
      data-drag-handle
      className="relative text-center leading-none"
    >
      <div
        className="group/node-image relative mx-auto rounded-md object-contain"
        style={{
          maxWidth: `min(${maxWidth}px, 100%)`,
          width: currentWidth,
          maxHeight: MAX_HEIGHT,
          aspectRatio: imageState.naturalSize.width && imageState.naturalSize.height 
            ? `${imageState.naturalSize.width} / ${imageState.naturalSize.height}`
            : 'auto',
        }}
      >
        <div
          className={cn(
            "relative flex h-full cursor-default flex-col items-center gap-2 rounded",
            {
              "outline outline-2 outline-offset-1 outline-primary":
                selected || isResizing,
            }
          )}
        >
          <div className="h-full contain-paint">
            <div className="relative h-full">
              {(!imageState.imageLoaded && (isLoading || imageState.isServerUploading)) && !imageState.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-md">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner className="size-7" />
                    <p className="text-xs text-muted-foreground">Loading image...</p>
                  </div>
                </div>
              )}

              {imageState.error && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 rounded-md">
                  <InfoCircledIcon className="size-8 text-destructive" />
                  <p className="mt-2 text-sm text-muted-foreground text-center px-2">
                    Failed to load image
                  </p>
                </div>
              )}

              {shouldRenderImage ? (
                <ControlledZoom
                  isZoomed={imageState.isZoomed}
                  onZoomChange={() =>
                    setImageState((prev) => ({ ...prev, isZoomed: false }))
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={cn(
                      "h-full w-full object-cover",
                      imageState.imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                      width: currentWidth,
                      height: currentHeight,
                    }}
                    width={currentWidth}
                    height={currentHeight}
                    src={imageUrl || undefined}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    alt={node.attrs.alt || ""}
                    title={node.attrs.title || ""}
                    data-storage-path={storagePath}
                    data-upload-complete={String(uploadComplete)}
                  />
                </ControlledZoom>
              ) : null}
            </div>

            {editor.isEditable &&
              imageState.imageLoaded &&
              !imageState.error &&
              !imageState.isServerUploading && (
                <>
                  <ResizeHandle
                    onPointerDown={handleResizeStart("left")}
                    className={cn("left-1", {
                      hidden: isResizing && activeResizeHandle === "right",
                    })}
                    isResizing={isResizing && activeResizeHandle === "left"}
                  />
                  <ResizeHandle
                    onPointerDown={handleResizeStart("right")}
                    className={cn("right-1", {
                      hidden: isResizing && activeResizeHandle === "left",
                    })}
                    isResizing={isResizing && activeResizeHandle === "right"}
                  />
                </>
              )}
          </div>

          {imageState.error && (
            <ActionWrapper>
              <ActionButton
                icon={<TrashIcon className="size-4" />}
                tooltip="Remove image"
                onClick={onRemoveImg}
              />
            </ActionWrapper>
          )}

          {!isResizing &&
            !imageState.error &&
            !imageState.isServerUploading && (
              <ImageActions
                shouldMerge={shouldMerge}
                isLink={isLink}
                onView={onView}
                onDownload={onDownload}
                onCopy={onCopy}
                onCopyLink={onCopyLink}
              />
            )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
