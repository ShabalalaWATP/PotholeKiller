import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES, readImageUpload, requireSameOrigin } from "../lib/security/request";

function upload(form = new FormData(), headers: Record<string, string> = {}) {
  return new Request("https://pothole.example/api/analyse", { method: "POST", body: form, headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("same-origin upload guard", () => {
  it("accepts its own origin", () => {
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://pothole.example" }))).not.toThrow();
  });
  it.each([{}, { origin: "https://other.example" }, { origin: "null" }, {
    origin: "https://pothole.example", "sec-fetch-site": "cross-site",
  }] as Record<string, string>[])("rejects missing, opaque and cross-site origins %j", headers => {
    expect(() => requireSameOrigin(upload(new FormData(), headers))).toThrow(/this site/);
  });
  it("supports a configured canonical deployment origin", () => {
    vi.stubEnv("APP_ORIGIN", "https://canonical.example/path");
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://canonical.example" }))).not.toThrow();
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://pothole.example" }))).toThrow();
  });
  it("uses Netlify's trusted deploy URL for preview origins", () => {
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("DEPLOY_PRIME_URL", "https://preview--pothole.example");
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://preview--pothole.example" }))).not.toThrow();
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://other.example" }))).toThrow();
  });
  it("keeps an explicit canonical origin ahead of a platform URL", () => {
    vi.stubEnv("APP_ORIGIN", "https://canonical.example");
    vi.stubEnv("DEPLOY_PRIME_URL", "https://preview--pothole.example");
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://canonical.example" }))).not.toThrow();
    expect(() => requireSameOrigin(upload(new FormData(), { origin: "https://preview--pothole.example" }))).toThrow();
  });
});

describe("bounded multipart upload", () => {
  it("reads one photograph", async () => {
    const form = new FormData();
    form.set("image", new File(["photo"], "photo.jpg", { type: "image/jpeg" }));
    const image = await readImageUpload(upload(form));
    expect(image.name).toBe("photo.jpg");
    expect(await image.text()).toBe("photo");
  });
  it("rejects non-multipart requests", async () => {
    const request = new Request("https://pothole.example/api/analyse", { method: "POST", body: "not an image" });
    await expect(readImageUpload(request)).rejects.toMatchObject({ status: 415 });
  });
  it.each(["-1", "invalid", String(MAX_IMAGE_BYTES + 65537)])("rejects invalid or excessive declared length %s", async length => {
    await expect(readImageUpload(upload(new FormData(), { "content-length": length }))).rejects.toMatchObject({ status: 413 });
  });
  it("bounds the actual stream even when its declared size is small", async () => {
    const request = new Request("https://pothole.example/api/analyse", {
      method: "POST", body: new Uint8Array(MAX_IMAGE_BYTES + 65537),
      headers: { "content-type": "multipart/form-data; boundary=test", "content-length": "1" },
    });
    await expect(readImageUpload(request)).rejects.toMatchObject({ status: 413 });
  });
  it("bounds pathological fragmentation as well as the total byte count", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 8193; i++) controller.enqueue(new Uint8Array());
        controller.close();
      },
    });
    const request = new Request("https://pothole.example/api/analyse", {
      method: "POST", body: stream, duplex: "half",
      headers: { "content-type": "multipart/form-data; boundary=test" },
    } as RequestInit & { duplex: "half" });
    await expect(readImageUpload(request)).rejects.toMatchObject({ status: 413 });
  });
  it("rejects absent body", async () => {
    const request = new Request("https://pothole.example/api/analyse", {
      method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" },
    });
    await expect(readImageUpload(request)).rejects.toMatchObject({ status: 400 });
  });
  it("rejects malformed multipart", async () => {
    const request = new Request("https://pothole.example/api/analyse", {
      method: "POST", body: "not multipart", headers: { "content-type": "multipart/form-data; boundary=test" },
    });
    await expect(readImageUpload(request)).rejects.toMatchObject({ status: 400 });
  });
  it("times out a stalled upload without holding its stream indefinitely", async () => {
    vi.useFakeTimers();
    const stream = new ReadableStream<Uint8Array>();
    const request = new Request("https://pothole.example/api/analyse", {
      method: "POST", body: stream, duplex: "half",
      headers: { "content-type": "multipart/form-data; boundary=test" },
    } as RequestInit & { duplex: "half" });
    const rejected = expect(readImageUpload(request)).rejects.toMatchObject({ status: 408, code: "UPLOAD_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
  });
  it.each(["missing", "text", "duplicate", "extra", "empty", "oversized"])("rejects %s images", async kind => {
    const form = new FormData();
    if (kind === "text") form.set("image", "not a file");
    else if (kind !== "missing") form.set("image", new File([
      kind === "oversized" ? new Uint8Array(MAX_IMAGE_BYTES + 1) : kind === "empty" ? "" : "image",
    ], "photo.jpg", { type: "image/jpeg" }));
    if (kind === "duplicate") form.append("image", new File(["another"], "second.jpg"));
    if (kind === "extra") form.set("remoteUrl", "https://untrusted.example/image.jpg");
    await expect(readImageUpload(upload(form))).rejects.toMatchObject({ status: ["empty", "oversized"].includes(kind) ? 413 : 400 });
  });
});
