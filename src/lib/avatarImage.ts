import { AVATAR_SIZE, MAX_AVATAR_CHARS } from './validation';

/** Width and height that fit the longer side in `max`, never enlarging. */
export function fitSize(width: number, height: number, max = AVATAR_SIZE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Encodes at 0.8 and lowers the quality until the result fits. Null when even the lowest doesn't. */
export function encodeToFit(encode: (quality: number) => string, maxChars = MAX_AVATAR_CHARS): string | null {
  for (let q = 8; q >= 1; q--) {
    const data = encode(q / 10);
    if (data.length <= maxChars) return data;
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    img.src = url;
  });
}

/** Any image the browser can read → a small JPEG data URL, ready for the avatar doc. */
export async function fileToAvatar(file: File): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = fitSize(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  // JPEG has no transparency: without this, transparent areas turn black.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const data = encodeToFit((q) => canvas.toDataURL('image/jpeg', q));
  if (!data || !data.startsWith('data:image/jpeg;base64,')) throw new Error('image too large');
  return data;
}
