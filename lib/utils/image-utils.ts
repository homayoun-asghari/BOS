export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetAspect = 16 / 9
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Use the original crop dimensions if they already match the target aspect ratio
  // (within a small tolerance to account for floating point precision)
  const aspectTolerance = 0.01;
  const currentAspect = pixelCrop.width / pixelCrop.height;
  const isTargetAspect = Math.abs(currentAspect - targetAspect) < aspectTolerance;
  
  let { width, height, x, y } = pixelCrop;
  
  // Only adjust the crop area if it doesn't already match the target aspect ratio
  if (!isTargetAspect) {
    // Adjust the crop area to maintain the target aspect ratio
    if (currentAspect > targetAspect) {
      // Too wide - adjust height
      const newHeight = width / targetAspect;
      y -= (newHeight - height) / 2;
      height = newHeight;
    } else {
      // Too tall - adjust width
      const newWidth = height * targetAspect;
      x -= (newWidth - width) / 2;
      width = newWidth;
    }
    
    // Ensure we don't go outside the image bounds
    x = Math.max(0, x);
    y = Math.max(0, y);
    width = Math.min(width, image.width - x);
    height = Math.min(height, image.height - y);
  }

  // Get the image data for the cropped area
  const data = ctx.getImageData(
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height)
  );

  // Set canvas size to final desired crop size with 16:9 aspect ratio
  const outputWidth = Math.round(width);
  const outputHeight = Math.round(width / targetAspect);
  
  // Create a new canvas for the final output
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputCtx = outputCanvas.getContext('2d');
  
  if (!outputCtx) {
    return '';
  }
  
  // Fill with white background (in case of transparent images)
  outputCtx.fillStyle = '#FFFFFF';
  outputCtx.fillRect(0, 0, outputWidth, outputHeight);
  
  // Draw the cropped image
  outputCtx.putImageData(data, 0, 0);

  // Return as a blob
  return new Promise((resolve) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      },
      'image/jpeg',
      0.9
    );
  });
}
