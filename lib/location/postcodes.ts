import { z } from "zod";
import { providerJson } from "./http";
import { UKCountrySchema } from "./schema";

export const PostcodeRecordSchema = z.object({
  postcode: z.string().min(5).max(10),
  country: UKCountrySchema,
  latitude: z.number().min(49.7).max(61.1).nullable(),
  longitude: z.number().min(-8.7).max(2.1).nullable(),
  admin_district: z.string().max(120).nullable(),
  admin_county: z.string().max(120).nullable(),
  codes: z.object({
    admin_district: z.string().max(12).nullable(),
    admin_county: z.string().max(12).nullable(),
  }),
});
export type PostcodeRecord = z.infer<typeof PostcodeRecordSchema>;

const POSTCODE = /\b(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;

export function extractPostcode(query: string): string | null {
  const match = query.match(POSTCODE)?.[1]?.replace(/\s/g, "").toUpperCase();
  return match ? `${match.slice(0, -3)} ${match.slice(-3)}` : null;
}

export async function lookupPostcode(postcode: string): Promise<PostcodeRecord | null> {
  const url = new URL(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s/g, ""))}`);
  const result = z.object({ result: PostcodeRecordSchema }).safeParse(await providerJson(url));
  return result.success ? result.data.result : null;
}

/** Nearest postcode is an approximation, not proof of an administrative boundary. */
export async function nearestPostcode(location: { lat: number; lng: number }): Promise<PostcodeRecord | null> {
  const url = new URL("https://api.postcodes.io/postcodes");
  url.searchParams.set("lat", String(location.lat));
  url.searchParams.set("lon", String(location.lng));
  url.searchParams.set("limit", "1");
  url.searchParams.set("radius", "2000");
  const result = z.object({ result: z.array(PostcodeRecordSchema).max(100).nullable() }).safeParse(await providerJson(url));
  return result.success ? result.data.result?.[0] ?? null : null;
}
