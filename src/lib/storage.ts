import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a Blob/File to Firebase Storage and return the public download URL.
 * If Firebase Storage is not enabled on the project, throws a friendly error.
 */
export async function uploadImage(blob: Blob, path: string): Promise<string> {
  try {
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, blob);
    return await getDownloadURL(snapshot.ref);
  } catch (err: any) {
    const code = err?.code || '';
    if (code.includes('storage/unknown') || code.includes('storage/object-not-found')) {
      throw new Error(
        'Firebase Storage is not enabled. Enable it in the Firebase console: ' +
        'https://console.firebase.google.com/project/eqc-dashboard-by-25g/storage'
      );
    }
    throw err;
  }
}

/**
 * Delete a Storage object by full URL or path.
 */
export async function deleteImage(urlOrPath: string): Promise<void> {
  try {
    // Try to convert URL to ref if a full URL was passed
    const fileRef = urlOrPath.startsWith('http')
      ? ref(storage, decodeURIComponent(urlOrPath.split('/o/')[1]?.split('?')[0] || urlOrPath))
      : ref(storage, urlOrPath);
    await deleteObject(fileRef);
  } catch (err: any) {
    // 404 is fine; image may already be gone
    if (err?.code === 'storage/object-not-found') return;
    throw err;
  }
}

/**
 * Reads a File as a data URL string (useful for preview before upload).
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Crops a source image (data URL) to the given pixel area and returns a Blob.
 * Used after react-easy-crop returns crop coordinates.
 */
export async function getCroppedBlob(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  outputSize = 512
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      'image/jpeg',
      0.9
    );
  });
}
