import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { RequestFailure } from "./errors";

const buckets = new Map<string, { count: number; expires: number }>();
let active = 0;
let dailyCount = 0;
let dailyWindow = "";

function setting(name: string, fallback: number, maximum: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
}

function requestKey(request: Request): string {
  // Only trust proxy identity when the operator has explicitly enabled it.
  const candidate = process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
    : "";
  return isIP(candidate) ? createHash("sha256").update(candidate).digest("hex") : "shared";
}

export function checkRateLimit(request: Request, now = Date.now()): void {
  for (const [key, bucket] of buckets) if (bucket.expires <= now) buckets.delete(key);
  const key = requestKey(request);
  const bucket = buckets.get(key) ?? { count: 0, expires: now + 60_000 };
  if ((!buckets.has(key) && buckets.size >= 1000) || bucket.count >= setting("ANALYSIS_RATE_LIMIT", 6, 120)) {
    throw new RequestFailure(429, "RATE_LIMITED", "The scanner is busy. Wait a minute, then try again.");
  }
  bucket.count += 1;
  buckets.set(key, bucket);
}

/** Reserve capacity before reading/decoding; validation does not spend API quota. */
export function reserveAnalysis(): () => void {
  if (active >= setting("ANALYSIS_CONCURRENCY_LIMIT", 2, 8)) {
    throw new RequestFailure(429, "SCANNER_BUSY", "Other photographs are being scanned. Please try again shortly.");
  }
  active += 1;
  let released = false;
  return () => {
    if (!released) active -= 1;
    released = true;
  };
}

/** Commit synchronously immediately before the paid call, including failed calls. */
export function chargeAnalysisAttempt(now = new Date()): void {
  const window = now.toISOString().slice(0, 10);
  if (window !== dailyWindow) {
    dailyWindow = window;
    dailyCount = 0;
  }
  if (dailyCount >= setting("ANALYSIS_DAILY_LIMIT", 100, 10_000)) {
    throw new RequestFailure(429, "DAILY_LIMIT", "Today's live scan limit has been reached. Try the labelled sample mode.");
  }
  dailyCount += 1;
}
