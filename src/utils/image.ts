import { IMAGE_TYPES, LIMITS } from '../../shared/constants';

/** Thrown with a message that is ready to show to the person who picked the file. */
export class ImageError extends Error {}

/** Checks a chosen file before anything is decoded: type first, then size. */
export function validateImageFile(file: File): void {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageError('Unsupported image type. Use a JPG, PNG or WebP file.');
  }
  if (file.size > LIMITS.photoSourceBytes) {
    throw new ImageError(`That file is too large. Choose an image under ${LIMITS.photoSourceBytes / 1024 / 1024} MB.`);
  }
}

export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.naturalWidth === 0 || image.naturalHeight === 0) reject(new ImageError('That image could not be read. Try a different file.'));
      else resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError('That image could not be read. Try a different file.'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageError('That image could not be processed. Try a different file.'))), 'image/jpeg', quality);
  });
}

/** The visible part of an image inside a square crop frame. */
export interface Crop {
  /** 1 fills the frame exactly; larger zooms in. */
  zoom: number;
  /** How far the image centre is from the frame centre, as a fraction of the frame size. */
  offsetX: number;
  offsetY: number;
}

/** Keeps the image covering the whole frame, whatever the zoom. */
export function clampCrop(crop: Crop, image: { naturalWidth: number; naturalHeight: number }): Crop {
  const zoom = Math.min(Math.max(crop.zoom, 1), 4);
  const shortest = Math.min(image.naturalWidth, image.naturalHeight);
  const maxX = Math.max(0, ((image.naturalWidth / shortest) * zoom - 1) / 2);
  const maxY = Math.max(0, ((image.naturalHeight / shortest) * zoom - 1) / 2);
  return {
    zoom,
    offsetX: Math.min(Math.max(crop.offsetX, -maxX), maxX),
    offsetY: Math.min(Math.max(crop.offsetY, -maxY), maxY),
  };
}

/**
 * Renders the cropped square as a JPEG. Re-encoding in the browser keeps uploads small and
 * strips location and camera metadata from the photo.
 */
export function cropToSquare(image: HTMLImageElement, crop: Crop, size = 512): Promise<Blob> {
  const shortest = Math.min(image.naturalWidth, image.naturalHeight);
  const side = shortest / crop.zoom;
  const centreX = image.naturalWidth / 2 - crop.offsetX * side;
  const centreY = image.naturalHeight / 2 - crop.offsetY * side;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new ImageError('That image could not be processed. Try a different file.'));
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, centreX - side / 2, centreY - side / 2, side, side, 0, 0, size, size);
  return canvasToJpeg(canvas, 0.9);
}

/** Scales an image down to fit within the given box (never up) and returns it as a JPEG. */
export async function resizeToFit(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  validateImageFile(file);
  const image = await loadImage(file);
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new ImageError('That image could not be processed. Try a different file.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas, 0.86);
}
