import sharp from "sharp";

for (const name of ["pothole", "crack", "croissant"]) {
  const browser = await sharp(`public/samples/${name}.jpg`).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const cleaned = await sharp(browser).jpeg({ quality: 80 }).toBuffer();
  for (const variant of ["original", "recompressed"]) {
  const source = variant === "original" ? `public/samples/${name}.jpg` : cleaned;
  const bytes = await sharp(source).rotate().resize({ width: 33, height: 32, fit: "fill" }).grayscale().raw().toBuffer();
  let bits = "";
  for (let row = 0; row < 32; row++) for (let column = 0; column < 32; column++) {
    bits += bytes[row * 33 + column] < bytes[row * 33 + column + 1] ? "1" : "0";
  }
  let hex = "";
  for (let bit = 0; bit < bits.length; bit += 4) hex += Number.parseInt(bits.slice(bit, bit + 4), 2).toString(16);
  console.log(JSON.stringify({ name, variant, fingerprint: hex }));
  }
}
