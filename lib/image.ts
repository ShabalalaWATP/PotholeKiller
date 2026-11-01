export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];

/** Re-encoding removes embedded EXIF and reduces transfer cost before upload. */
export async function prepareImage(file: File): Promise<{ file: File; preview: string; hash: string }> {
  if (!ACCEPTED_IMAGES.includes(file.type)) throw new Error("Choose a JPEG, PNG or WEBP photograph.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("That photo is over 6 MB. Choose a smaller image.");
  if (!file.size) throw new Error("That photo is empty. Please choose another.");
  const sourceBytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16_000_000) throw new Error("Choose a photo smaller than 16 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the photo. Try a different browser.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not resize this photo.")), "image/jpeg", .85));
    return { file: new File([blob], "road-photo.jpg", { type: "image/jpeg" }), preview: URL.createObjectURL(blob), hash };
  } finally { bitmap.close(); }
}
