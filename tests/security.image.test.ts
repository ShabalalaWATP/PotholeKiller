import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { sanitiseImage } from "../lib/security/image";
import { MAX_IMAGE_BYTES } from "../lib/security/request";

async function sample(format: "jpeg" | "png" | "webp" = "jpeg") {
  return sharp({ create: { width: 20, height: 20, channels: 3, background: "#555555" } })[format]().toBuffer();
}

describe("image sanitisation", () => {
  it.each(["jpeg", "png", "webp"] as const)("decodes %s and emits a small JPEG", async format => {
    const image = new File([new Uint8Array(await sample(format))], `image.${format}`, { type: `image/${format}` });
    const result = await sanitiseImage(image);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    const metadata = await sharp(Buffer.from(result.split(",")[1], "base64")).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(20);
  });

  it("strips EXIF and constrains dimensions before the provider request", async () => {
    const source = await sharp({ create: { width: 1800, height: 900, channels: 3, background: "#888888" } })
      .withMetadata({ exif: { IFD0: { Artist: "Private person" } } }).jpeg().toBuffer();
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const cleaned = await sanitiseImage(new File([new Uint8Array(source)], "metadata.jpg", { type: "image/jpeg" }));
    const metadata = await sharp(Buffer.from(cleaned.split(",")[1], "base64")).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });

  it.each([
    ["image/svg+xml", "<svg/>"],
    ["image/jpeg", "not a JPEG"],
    ["image/png", "not a PNG"],
    ["image/webp", "not a WEBP"],
    ["image/jpeg", ""],
  ])("rejects unsupported or disguised %s", async (type, data) => {
    await expect(sanitiseImage(new File([data], "untrusted", { type }))).rejects.toMatchObject({ status: 415 });
  });

  it("rejects an oversized file", async () => {
    await expect(sanitiseImage(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "large.jpg", { type: "image/jpeg" })))
      .rejects.toMatchObject({ status: 415 });
  });

  it("rejects a correct signature with invalid image contents", async () => {
    await expect(sanitiseImage(new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "broken.jpg", { type: "image/jpeg" })))
      .rejects.toMatchObject({ status: 415 });
  });
  it("rejects excessive decoded dimensions even when the compressed file is small", async () => {
    const huge = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "#888888" } }).jpeg().toBuffer();
    expect(huge.byteLength).toBeLessThan(MAX_IMAGE_BYTES);
    await expect(sanitiseImage(new File([new Uint8Array(huge)], "huge-dimensions.jpg", { type: "image/jpeg" })))
      .rejects.toMatchObject({ status: 415 });
  });

  it("rejects a decoding format that disagrees with the declared format", async () => {
    const png = await sample("png");
    await expect(sanitiseImage(new File([new Uint8Array(png)], "disguised.jpg", { type: "image/jpeg" })))
      .rejects.toMatchObject({ status: 415 });
  });
});
