import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const sourceUrl = "https://raw.githubusercontent.com/alphagov/local-links-manager/main/data/local-authorities.csv";
const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000), redirect: "error" });
if (!response.ok) throw new Error(`Directory returned ${response.status}`);
const source = await response.text();
if (source.length > 100000) throw new Error("Unexpected directory size");
const rows = source.trim().split(/\r?\n/).slice(1).map(line => {
  // The source quotes council names, including names containing commas.
  const cells = line.match(/(?:"(?:[^"]|"")*"|[^,]*)(?:,|$)/g)
    .filter(Boolean).map(cell => cell.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
  const [id, code, , , tier, parent, slug, country, website, name] = cells;
  if (!/^[ENSW]\d{8}$/.test(code) || !/^https?:\/\//.test(website)) throw new Error("Invalid directory row");
  const url = new URL(website);
  url.protocol = "https:";
  if (url.username || url.password) throw new Error("Invalid directory website");
  return { code, name, website: url.href, slug, country, tier: Number(tier), id: Number(id), parent: parent ? Number(parent) : null };
});
const bytes = Buffer.from(source);
const sourceBlob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
await writeFile(new URL("./authorities.generated.json", import.meta.url), JSON.stringify({
  sourceUrl, sourceBlob, retrievedAt: new Date().toISOString().slice(0, 10), licence: "MIT (alphagov/local-links-manager)", authorities: rows,
}, null, 2) + "\n");
const licenceResponse = await fetch("https://raw.githubusercontent.com/alphagov/local-links-manager/main/LICENCE", {
  signal: AbortSignal.timeout(15000), redirect: "error",
});
if (!licenceResponse.ok) throw new Error("Could not retain the source licence notice");
const licence = await licenceResponse.text();
if (licence.length > 10000 || !licence.includes("Permission is hereby granted")) throw new Error("Unexpected source licence");
await writeFile(new URL("./DIRECTORY_LICENCE.txt", import.meta.url), licence);
console.log(JSON.stringify({ count: rows.length, sourceBlob, output: "lib/location/authorities.generated.json" }));
