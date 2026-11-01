import { readFile, mkdir, writeFile } from "node:fs/promises";

// Opt-in only: the running local server makes two paid OpenAI requests.
const base = new URL(process.env.LIVE_BASE_URL || "http://127.0.0.1:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) {
  throw new Error("Live smoke checks must target a local server.");
}
const results = [];
for (const sample of ["pothole", "croissant"]) {
  const bytes = await readFile(new URL(`../public/samples/${sample}.jpg`, import.meta.url));
  const body = new FormData();
  body.set("image", new File([bytes], `${sample}.jpg`, { type: "image/jpeg" }));
  const started = performance.now();
  const response = await fetch(new URL("/api/analyse", base), {
    method: "POST",
    headers: { Origin: base.origin },
    body,
    signal: AbortSignal.timeout(55_000),
  });
  const data = await response.json();
  if (!response.ok || data.source !== "live") {
    throw new Error(`${sample}: live scan failed (HTTP ${response.status}, ${data.code || "INVALID_RESULT"}).`);
  }
  const assessment = data.analysis;
  const capturable = assessment.isRoadSurface && assessment.visibleDamage &&
    ["pothole", "surface_crack", "surface_wear"].includes(assessment.defectType) &&
    !assessment.needsHumanReview && assessment.photoQuality !== "poor";
  if (sample === "pothole" && !capturable) throw new Error("Pothole sample was not confidently classified as visible road damage.");
  if (sample === "croissant" && (capturable || assessment.defectType !== "not_road" || !/\bcroissant\b/i.test(assessment.identifiedObject))) {
    throw new Error("Croissant sample was not recognised and rejected.");
  }
  results.push({ sample, source: data.source, defectType: assessment.defectType,
    identifiedObject: assessment.identifiedObject, capturable,
    durationSeconds: Math.round((performance.now() - started) / 100) / 10 });
}
await mkdir("output", { recursive: true });
await writeFile("output/live-vision-results.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ passed: true, results }, null, 2));
