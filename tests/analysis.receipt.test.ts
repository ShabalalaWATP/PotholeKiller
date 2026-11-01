import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maybeIssueScanReceipt } from "../lib/community/scan-receipt";
import type { DefectAnalysis } from "../lib/ai/schema";

const boundary = vi.hoisted(() => ({ user: vi.fn(), issue: vi.fn() }));
vi.mock("@netlify/identity", () => ({ getUser: boundary.user }));
vi.mock("../lib/community/receipts", () => ({ issueScanReceipt: boundary.issue }));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECEIPT_ID = "22222222-2222-4222-8222-222222222222";
const assessment: DefectAnalysis = {
  isRoadSurface: true, defectType: "pothole", visibleDamage: true,
  factualDescription: "Broken asphalt is visible.", visibleObservations: ["Irregular broken edges"],
  photoQuality: "good", needsHumanReview: false, identifiedObject: "damaged road",
  funnyNickname: "Sir Cracksalot", humorousDescription: "Mind the gap.",
};
const request = (headers: Record<string, string> = {}) => new Request("https://pothole.example/api/analyse", { method: "POST", headers });
const dataUrl = (bytes: Buffer) => `data:image/jpeg;base64,${bytes.toString("base64")}`;
let photograph: Buffer;

beforeEach(async () => {
  boundary.user.mockReset().mockResolvedValue({ id: USER_ID });
  boundary.issue.mockReset().mockResolvedValue({ receiptId: RECEIPT_ID, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() });
  photograph = await sharp({ create: { width: 48, height: 32, channels: 3, background: "#c04a17" } }).jpeg().toBuffer();
});
afterEach(() => vi.useRealTimers());

describe("server-bound optional scan receipts", () => {
  it("binds a receipt to official SDK identity and the server-cleaned image bytes", async () => {
    const result = await maybeIssueScanReceipt(request({ "x-user-id": "attacker", "x-image-hash": "forged" }), dataUrl(photograph), assessment);
    expect(result).toMatchObject({ receiptId: RECEIPT_ID, receiptExpiresAt: expect.any(String) });
    expect(boundary.issue).toHaveBeenCalledWith(USER_ID, createHash("sha256").update(photograph).digest("hex"));
  });
  it("does not contact receipt storage for a guest", async () => {
    boundary.user.mockResolvedValue(null);
    expect(await maybeIssueScanReceipt(request(), dataUrl(photograph), assessment)).toEqual({});
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it("does not accept a non-UUID actor from an invalid identity context", async () => {
    boundary.user.mockResolvedValue({ id: "not-an-authenticated-uuid" });
    expect(await maybeIssueScanReceipt(request(), dataUrl(photograph), assessment)).toEqual({});
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it("skips explicitly labelled demonstrations before authentication or storage", async () => {
    expect(await maybeIssueScanReceipt(request({ "X-Pothole-Demo": "1" }), dataUrl(photograph), assessment)).toEqual({});
    expect(boundary.user).not.toHaveBeenCalled();
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it.each(["pothole", "crack", "croissant"])("rejects a recompressed bundled %s even when the client demo header is removed", async sample => {
    const original = await readFile(`public/samples/${sample}.jpg`);
    // Approximate the canvas JPEG upload, then the real server's JPEG re-encode.
    const browserCopy = await sharp(original).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const cleaned = await sharp(browserCopy).jpeg({ quality: 80 }).toBuffer();
    expect(await maybeIssueScanReceipt(request(), dataUrl(cleaned), assessment)).toEqual({});
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it.each([
    { defectType: "uncertain" }, { defectType: "not_road" }, { needsHumanReview: true }, { visibleDamage: false }, { photoQuality: "poor" },
  ] as Partial<DefectAnalysis>[])("does not award receipts for an ineligible assessment %j", async changes => {
    expect(await maybeIssueScanReceipt(request(), dataUrl(photograph), { ...assessment, ...changes })).toEqual({});
    expect(boundary.user).not.toHaveBeenCalled();
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it("preserves the scan when local Identity context is unavailable", async () => {
    boundary.user.mockRejectedValue(new Error("No Netlify request context"));
    expect(await maybeIssueScanReceipt(request(), dataUrl(photograph), assessment)).toEqual({ receiptUnavailable: true });
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it("preserves the scan when database storage is unavailable", async () => {
    boundary.issue.mockRejectedValue(new Error("Database unavailable"));
    expect(await maybeIssueScanReceipt(request(), dataUrl(photograph), assessment)).toEqual({ receiptUnavailable: true });
  });
  it("rejects malformed receipt metadata without claiming a receipt", async () => {
    boundary.issue.mockResolvedValue({ receiptId: "forged", expiresAt: "never" });
    expect(await maybeIssueScanReceipt(request(), dataUrl(photograph), assessment)).toEqual({ receiptUnavailable: true });
  });
  it.each(["https://untrusted.example/photo.jpg", "data:image/jpeg;base64,invalid"])("fails closed on invalid server-cleaned image data", async image => {
    expect(await maybeIssueScanReceipt(request(), image, assessment)).toEqual({ receiptUnavailable: true });
    expect(boundary.issue).not.toHaveBeenCalled();
  });
  it("bounds optional identity/storage work so a live result remains usable", async () => {
    vi.useFakeTimers();
    boundary.user.mockReturnValue(new Promise(() => {}));
    const result = maybeIssueScanReceipt(request(), dataUrl(photograph), assessment);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toEqual({ receiptUnavailable: true });
    expect(boundary.issue).not.toHaveBeenCalled();
  });
});
