import { mkdir, writeFile } from "node:fs/promises";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3001");
if (!["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("This smoke check targets a local review server only.");
const cases = [
  { name: "London postcode", input: { query: "E8 1DY" } },
  { name: "Scottish postcode", input: { query: "EH1 1YZ" } },
  { name: "Welsh postcode", input: { query: "CF10 1EP" } },
  { name: "Northern Irish postcode", input: { query: "BT1 1AA" } },
  { name: "English two-tier postcode", input: { query: "BR8 7RE" } },
  { name: "Full road address without postcode", input: { query: "282 Mare Street London" } },
];
const results = [];
await mkdir("output", { recursive: true });
for (const item of cases) {
  const started = Date.now();
  try {
    const response = await fetch(new URL("/api/location", base), {
      method: "POST", headers: { Origin: base.origin, "Content-Type": "application/json" },
      body: JSON.stringify(item.input), signal: AbortSignal.timeout(30_000),
    });
    const body = await response.json();
    const result = {
      case: item.name, status: response.status, elapsedMs: Date.now() - started,
      candidates: body.candidates?.map(candidate => ({
        label: candidate.label, location: candidate.location, postcode: candidate.postcode,
        country: candidate.country, accuracy: candidate.accuracy, council: candidate.council,
        warnings: candidate.warnings,
      })),
      error: body.error, code: body.code,
    };
    results.push(result);
    console.log(JSON.stringify(result));
  } catch (error) {
    const result = { case: item.name, error: error.message, elapsedMs: Date.now() - started };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  await writeFile("output/location-live-results.json", JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + "\n");
}
if (results.some(result => result.status !== 200)) process.exitCode = 1;
