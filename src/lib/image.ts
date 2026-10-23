// Client-side compression: max 1600px on the longest side, JPEG.
const MAX_SIDE = 1600;
const QUALITY = 0.8;

export async function compressImage(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  // imageOrientation honours EXIF rotation from phone cameras.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir"))), "image/jpeg", QUALITY),
  );
}

/** Small copy for lists and grids (feed, today): a few KB instead of ~200 KB. */
export const THUMB_SIDE = 480;
export function thumbPath(path: string) {
  return path.replace(/\.jpg$/, ".thumb.jpg");
}

/** Uploads to the private bucket under <group>/<user>/ (required by storage RLS). */
export function mediaPath(groupId: string, userId: string, prefix: string) {
  return `${groupId}/${userId}/${prefix}-${crypto.randomUUID()}.jpg`;
}
