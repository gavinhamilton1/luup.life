// Client-side resize is an optional upload-bandwidth optimization — the
// server's Pillow pipeline resizes, re-encodes to WebP, and strips EXIF
// authoritatively, so on unreliable decoders we just pass the original file
// through and let the server do the work.
//
// We only attempt a client resize for files larger than this threshold,
// with aggressive timeouts so a stuck decoder never blocks the upload.
const CLIENT_RESIZE_THRESHOLD = 3 * 1024 * 1024; // 3 MB
const MAX_EDGE = 1600;
const DECODE_TIMEOUT_MS = 2000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image decode failed'));
    };
    img.src = url;
  });
}

export async function resizeImage(file) {
  if (!file || file.size < CLIENT_RESIZE_THRESHOLD) {
    return file;
  }
  try {
    const img = await withTimeout(loadImage(file), DECODE_TIMEOUT_MS, 'decode');
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= MAX_EDGE) return file;
    const scale = MAX_EDGE / longest;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await withTimeout(
      new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85)),
      DECODE_TIMEOUT_MS,
      'toBlob'
    );
    if (!blob) return file;
    return new File(
      [blob],
      (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg',
      { type: 'image/jpeg' }
    );
  } catch (e) {
    console.warn('[luup] client resize failed, uploading original:', e.message);
    return file;
  }
}
