import { RequestFailure } from "./errors";

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
const MAX_UPLOAD_CHUNKS = 8192;

export function requireSameOrigin(request: Request): void {
  const canonicalOrigin = process.env.APP_ORIGIN || process.env.DEPLOY_PRIME_URL;
  const expectedOrigin = canonicalOrigin
    ? new URL(canonicalOrigin).origin
    : new URL(request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    throw new RequestFailure(403, "ORIGIN_REJECTED", "Open the scanner on this site to upload a photograph.");
  }
}

/** Bound the stream itself; Content-Length is optional and is not trusted. */
export async function readImageUpload(request: Request): Promise<File> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new RequestFailure(415, "INVALID_UPLOAD", "Upload a JPEG, PNG or WEBP photograph.");
  }
  const rawLength = request.headers.get("content-length");
  if (rawLength !== null && (!/^\d+$/.test(rawLength) || Number(rawLength) > MAX_REQUEST_BYTES)) {
    throw new RequestFailure(413, "IMAGE_TOO_LARGE", "Choose a photograph smaller than 6 MB.");
  }
  if (!request.body) {
    throw new RequestFailure(400, "INVALID_UPLOAD", "Choose a photograph first.");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RequestFailure(408, "UPLOAD_TIMEOUT", "The upload took too long. Please try again."));
      void reader.cancel().catch(() => undefined);
    }, 15_000);
  });
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REQUEST_BYTES || chunks.length >= MAX_UPLOAD_CHUNKS) {
        void reader.cancel().catch(() => undefined);
        throw new RequestFailure(413, "IMAGE_TOO_LARGE", "Choose a photograph smaller than 6 MB.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new RequestFailure(400, "INVALID_UPLOAD", "That upload could not be read. Please try again.");
  }
  const image = form.get("image");
  if (!(image instanceof File) || form.getAll("image").length !== 1 || [...form.keys()].some(key => key !== "image")) {
    throw new RequestFailure(400, "INVALID_UPLOAD", "Upload one photograph at a time.");
  }
  if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    throw new RequestFailure(413, "IMAGE_TOO_LARGE", "Choose a non-empty photograph smaller than 6 MB.");
  }
  return image;
}
