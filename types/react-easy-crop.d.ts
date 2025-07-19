declare module 'react-easy-crop' {
  export type Point = { x: number; y: number };
  export type Area = {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  
  export interface Crop {
    x: number;
    y: number;
  }
  
  export interface CropperProps {
    image?: string;
    crop: Point;
    zoom: number;
    aspect?: number;
    onCropChange: (location: Point) => void;
    onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
    onZoomChange?: (zoom: number) => void;
    cropShape?: 'rect' | 'round';
    showGrid?: boolean;
    zoomSpeed?: number;
    maxZoom?: number;
    minZoom?: number;
    cropSize?: { width: number; height: number };
    style?: {
      containerStyle?: React.CSSProperties;
      mediaStyle?: React.CSSProperties;
      cropAreaStyle?: React.CSSProperties;
    };
  }
  
  const Cropper: React.FC<CropperProps>;
  export default Cropper;
}
