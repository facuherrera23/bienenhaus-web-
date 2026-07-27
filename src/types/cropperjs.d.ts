// Type declarations for cropperjs
declare module 'cropperjs' {
  interface CropperOptions {
    aspectRatio?: number;
    viewMode?: number;
    dragMode?: 'crop' | 'move' | 'none';
    autoCropArea?: number;
    responsive?: boolean;
    restore?: boolean;
    guides?: boolean;
    center?: boolean;
    highlight?: boolean;
    cropBoxMovable?: boolean;
    cropBoxResizable?: boolean;
    toggleDragModeOnDblclick?: boolean;
    ready?: () => void;
    cropstart?: (event: CropperEvent) => void;
    cropmove?: (event: CropperEvent) => void;
    cropend?: (event: CropperEvent) => void;
    crop?: (event: CropperEvent) => void;
    zoom?: (event: CropperEvent) => void;
  }

  interface CropperEvent {
    type: string;
    detail: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotate: number;
      scaleX: number;
      scaleY: number;
    };
  }

  interface CanvasOptions {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    imageSmoothingEnabled?: boolean;
    imageSmoothingQuality?: 'low' | 'medium' | 'high';
    fillColor?: string;
  }

  interface GetCroppedCanvasOptions extends CanvasOptions {
    width?: number;
    height?: number;
  }

  interface Cropper {
    new (element: HTMLImageElement | HTMLCanvasElement, options?: CropperOptions): Cropper;
    getCroppedCanvas(options?: GetCroppedCanvasOptions): HTMLCanvasElement;
    getData(): { x: number; y: number; width: number; height: number; rotate: number; scaleX: number; scaleY: number };
    getImageData(): { naturalWidth: number; naturalHeight: number; aspectRatio: number; rotate: number; scaleX: number; scaleY: number };
    getContainerData(): { width: number; height: number };
    getCropBoxData(): { left: number; top: number; width: number; height: number };
    getCanvasData(): { left: number; top: number; width: number; height: number; naturalWidth: number; naturalHeight: number };
    setData(data: { x?: number; y?: number; width?: number; height?: number; rotate?: number; scaleX?: number; scaleY?: number }): Cropper;
    setCropBoxData(data: { left?: number; top?: number; width?: number; height?: number }): Cropper;
    setCanvasData(data: { left?: number; top?: number; width?: number; height?: number }): Cropper;
    setDragMode(mode: 'crop' | 'move' | 'none'): Cropper;
    setAspectRatio(aspectRatio: number): Cropper;
    zoom(ratio: number): Cropper;
    zoomTo(ratio: number, pivot?: { x: number; y: number }): Cropper;
    rotate(degree: number): Cropper;
    scale(scaleX: number, scaleY?: number): Cropper;
    scaleX(scaleX: number): Cropper;
    scaleY(scaleY: number): Cropper;
    move(offsetX: number, offsetY: number): Cropper;
    moveTo(x: number, y: number): Cropper;
    replace(url: string, hasSameSize?: boolean): Cropper;
    clear(): Cropper;
    enable(): Cropper;
    disable(): Cropper;
    destroy(): Cropper;
    reset(): Cropper;
    crop(): Cropper;
  }

  const Cropper: Cropper;
  export default Cropper;
}