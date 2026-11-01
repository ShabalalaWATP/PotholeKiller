import sharp from "sharp";
import { RequestFailure } from "./errors";
import { MAX_IMAGE_BYTES } from "./request";

const FORMATS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

function signatureMatches(bytes: Buffer, format: string): boolean {
  if (format === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (format === "png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
}

/** Decode and re-encode on the server so no EXIF or other metadata reaches OpenAI. */
export async function sanitiseImage(image: File): Promise<string> {
  const format = FORMATS[image.type.toLowerCase()];
  if (!format || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    throw new RequestFailure(415, "INVALID_IMAGE", "Choose a JPEG, PNG or WEBP photograph smaller than 6 MB.");
  }
  const input = Buffer.from(await image.arrayBuffer());
  if (!signatureMatches(input, format)) {
    throw new RequestFailure(415, "INVALID_IMAGE", "The file contents do not match its image format.");
  }
  try {
    const decoder = sharp(input, { limitInputPixels: 16_000_000, failOn: "warning" });
    const metadata = await decoder.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
      throw new Error("Unsupported image");
    }
    const clean = await decoder.rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${clean.toString("base64")}`;
  } catch {
    throw new RequestFailure(415, "INVALID_IMAGE", "That photograph could not be decoded. Use a still image below 16 megapixels.");
  }
}
