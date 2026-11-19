/**
 * Shrink a photo in the browser before upload: longest side ≤ 1600 px, WebP (JPEG on old browsers),
 * stepping quality down until it is under ~780 KB. A 12 MP phone photo becomes ~150–300 KB.
 */
const MAX_SIDE = 1600;
const MAX_BYTES = 780 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file is not a photo we can read. Use JPG, PNG or WebP.')); };
    img.src = url;
  });
}
const toBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));

export async function resizeImage(file) {
  if (!/^image\//.test(file.type)) throw new Error('Choose a photo (JPG, PNG or WebP)');
  const img = await loadImage(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); // transparent PNGs get a white background
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.85, 0.75, 0.65]) {
      let blob = await toBlob(canvas, 'image/webp', q);
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q);
      if (blob && blob.size <= MAX_BYTES) return { blob, width: w, height: h };
    }
    scale *= 0.75;
  }
  throw new Error('Photo is too large even after resizing. Try another photo.');
}
