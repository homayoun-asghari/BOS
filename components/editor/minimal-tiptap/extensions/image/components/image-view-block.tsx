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
import { blobUrlToBase64, randomId } from "../../../utils"
import { InfoCircledIcon, TrashIcon } from "@radix-ui/react-icons"
import { Spinner } from "../../../components/spinner"
import type { UploadReturnType } from "../image"
// Removed unused import

const MAX_HEIGHT = 600
const MIN_HEIGHT = 120
const MIN_WIDTH = 120

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
  id: typeof res === "string" ? randomId() : res.id,
})

export const ImageViewBlock: React.FC<NodeViewProps> = ({
  editor,
  node,
  selected,
  updateAttributes,
}) => {
  const {
    src: initialSrc,
    width: initialWidth,
    height: initialHeight,
    fileName,
  } = node.attrs
  const uploadAttemptedRef = React.useRef(false)

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
  const [retryCount, setRetryCount] = React.useState(0);
  const MAX_RETRIES = 3;
  
  // Get the storage path from node attributes or fall back to src if not available
  const storagePath = node.attrs['data-storage-path'] || node.attrs.src;
  const uploadComplete = node.attrs['data-upload-complete'] === 'true';
  
  // State for the image URL - start with empty to prevent initial load with local path
  const [imageUrl, setImageUrl] = React.useState<string>('');
  
  // Clean up the storage path to remove any query parameters or fragments
  const cleanStoragePath = (path: string): string => {
    if (!path) return '';
    // If it's a blob URL, return it as is
    if (path.startsWith('blob:')) return path;
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

      // If it's already a full URL, use it directly
      if (cleanPath.startsWith('http')) {
        if (isMounted) {
          setImageUrl(cleanPath);
          setImageState(prev => ({ ...prev, error: false }));
          setIsLoading(false);
        }
        return;
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
            throw new Error('Failed to generate signed URL');
          }
          return signedUrl;
          
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[ImageViewBlock] Error getting signed URL (attempt ${retry + 1}):`, error);
          }
          if (retry < MAX_RETRIES - 1) {
            // Wait before retrying (exponential backoff)
            const delay = 1000 * Math.pow(2, retry);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getSignedImageUrl(retry + 1);
          }
          throw error;
        }
      };
      
      try {
        const url = await getSignedImageUrl(retryCount);
        if (isMounted && url) {
          setImageUrl(url);
          setImageState(prev => ({ ...prev, error: false }));
        } else if (isMounted) {
          throw new Error(`Failed to get signed URL for path: ${cleanPath}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to load image after all retries:', error);
        }
        setImageState(prev => ({ ...prev, error: true }));
        if (retryCount < MAX_RETRIES - 1) {
          setRetryCount(prev => prev + 1);
        } else {
          console.error('Max retries reached, giving up');
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
  }, [cleanPath, uploadComplete, retryCount]);

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
      updateAttributes({
        width: img.width || newNaturalSize.width,
        height: img.height || newNaturalSize.height,
        alt: img.alt,
        title: img.title,
      })

      if (!initialWidth) {
        updateDimensions((state) => ({ ...state, width: newNaturalSize.width }))
      }
    },
    [initialWidth, updateAttributes, updateDimensions]
  )

  const handleImageError = React.useCallback(() => {
    setImageState((prev) => ({ ...prev, error: true }));
    console.error('Failed to load image:', imageUrl);
  }, [imageUrl])

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
          updateAttributes({ src: base64 })
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

        setImageState((prev) => ({
          ...prev,
          ...normalizedData,
          isServerUploading: false,
        }))

        updateAttributes(normalizedData)
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
  }, [editor, fileName, initSrc, updateAttributes])

  const shouldRenderImage = imageUrl && !imageState.error;

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
              {(isLoading || imageState.isServerUploading) && !imageState.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-md">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner className="size-7" />
                    <p className="text-xs text-muted-foreground">
                      {retryCount > 0 ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Loading image...'}
                    </p>
                  </div>
                </div>
              )}

              {imageState.error && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 rounded-md">
                  <InfoCircledIcon className="size-8 text-destructive" />
                  <p className="mt-2 text-sm text-muted-foreground text-center px-2">
                    {retryCount >= MAX_RETRIES 
                      ? 'Failed to load image' 
                      : `Loading failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`}
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
                    src={imageUrl}
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
