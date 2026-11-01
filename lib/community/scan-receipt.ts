import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { isCapturable, type DefectAnalysis } from "../ai/schema";

// 32×32 difference fingerprints of the three bundled sample assets, generated
// with tests/receipt-fixtures.mjs. They recognise near-identical demo copies,
// including JPEG recompression, and do not identify distinct physical defects.
const DEMO_FINGERPRINTS = [
  "2348dd470f5a915b574e77f1f8ffcdf1d87fdd89f07ff909fbf7ed0b615f593387ff6e921eaea89d604ccb19c06ef059ca01cd494130fc1880c1384b48d2120a3032621430c329c87304a5265598c4a71958b4302e24a044b024e0e4b2132464e94144987d84a6d266506154b4ad2ec23d1288dafc51e354bae8c3249c6da248",
  "7ae68400dae984a0b6922420af851008278564489ec3262c99c6a4015a60688ca3c6943ce665690c620a6a08d54a765893a5a44c253494c8ad2a396884a86269162495404e15d8db04336c432465642409356c849c4d6664344d2f62dc25ab686495ac68654335225c599312a859126ca8e61e6ab8aa584099665820d6a40c50",
  "000000000000000000000000000001b000004db8000008180000001c0000001a4100001b2a20081b94c808194b30801950380c19c69d0e19063c0f1b10d11b9ba7917392fc11c7d670d18dfc919a9c3b831a5c3d861c48ed2c0c44cd0e05c10e4630794e1f18087a70d98074cc3d0067000fe00fc000007fb00003ffd00003ff",
  "2348dd474f5a915b534e77f1d8bfcdf1d87fdd89f077f909fef76d0b625b593387ff6e921eae8a9d604ccb19c06ef059ca00cd49c130fc1a80c1384988d2120a9032631430c329c85304a5665158c4a71958b4302e24a0443024e9e4b0132464a945449a7d8426d26250634cb4b72ca23d128cdafcd0c354aae8c3249c6da248",
  "7ae68400dae984a096922420af851008278560089ecb262c9b46a4015841688ca386943ce665290d62aa6a09d54a765893a5a04c253494c8ad2a316884a8e369162495604f15d8db04336c412465642409356c849c4d6664344d2f62dc25ab686495ac68654315225c599312a85b526ca8a61e6ab8aa584099664820d6a40c50",
  "0000000000000000000000000080012000804db8000208180000001c0000001a4100021b1420081b94c808194b31801930380c19c69d0e19063c0f1b10d11b9ba7917392fc11c7d670d18dfc919a9c3b831a5c3d861c4ced2c0c44cd0e05c10e4630794e1f1c087a70d98074cc3e0067000fe00fc000007fa00003ffd00003ff",
];
const BIT_COUNTS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
const ReceiptSchema = z.object({ receiptId: z.uuid(), expiresAt: z.iso.datetime({ offset: true }) }).strict();

export type ScanReceiptResult = {
  receiptId?: string;
  receiptExpiresAt?: string;
  receiptUnavailable?: true;
};

async function isBundledSample(bytes: Buffer): Promise<boolean> {
  const pixels = await sharp(bytes, { limitInputPixels: 16_000_000 })
    .rotate().resize({ width: 33, height: 32, fit: "fill" }).grayscale().raw().toBuffer();
  let fingerprint = "";
  for (let row = 0; row < 32; row++) {
    let nibble = 0;
    for (let column = 0; column < 32; column++) {
      nibble = (nibble << 1) | Number(pixels[row * 33 + column] < pixels[row * 33 + column + 1]);
      if (column % 4 === 3) { fingerprint += nibble.toString(16); nibble = 0; }
    }
  }
  return DEMO_FINGERPRINTS.some(sample => {
    let differences = 0;
    for (let index = 0; index < sample.length; index++) {
      differences += BIT_COUNTS[Number.parseInt(sample[index], 16) ^ Number.parseInt(fingerprint[index], 16)];
    }
    return differences <= 32;
  });
}

/** Optional community receipt creation never prevents a successful live scan. */
export async function maybeIssueScanReceipt(request: Request, cleanedImage: string, analysis: DefectAnalysis): Promise<ScanReceiptResult> {
  if (request.headers.get("x-pothole-demo") === "1" || !isCapturable(analysis)) return {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const operation = async (): Promise<ScanReceiptResult> => {
      const { getUser } = await import("@netlify/identity");
      const userId = z.uuid().safeParse((await getUser())?.id);
      if (!userId.success) return {};
      const prefix = "data:image/jpeg;base64,";
      if (!cleanedImage.startsWith(prefix)) throw new Error("Expected a server-cleaned JPEG");
      const bytes = Buffer.from(cleanedImage.slice(prefix.length), "base64");
      if (await isBundledSample(bytes)) return {};
      const imageHash = createHash("sha256").update(bytes).digest("hex");
      // No DB module is loaded for guests, invalid assessments or sample images.
      const { issueScanReceipt } = await import("./receipts");
      const receipt = ReceiptSchema.parse(await issueScanReceipt(userId.data, imageHash));
      return { receiptId: receipt.receiptId, receiptExpiresAt: receipt.expiresAt };
    };
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Receipt unavailable")), 5000); }),
    ]);
  } catch {
    return { receiptUnavailable: true };
  } finally {
    clearTimeout(timer);
  }
}
