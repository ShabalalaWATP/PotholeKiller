import { z } from "zod";
import { isTrustedCouncilContact } from "./trust";

const position = {
  lat: z.number().finite().min(49.7).max(61.1),
  lng: z.number().finite().min(-8.7).max(2.1),
};

export const LocationInputSchema = z.union([
  z.object({ query: z.string().trim().min(3).max(180).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Use a road address or postcode.") }).strict(),
  z.object(position).strict(),
]);

export type LocationInput = z.infer<typeof LocationInputSchema>;
export const UKCountrySchema = z.enum(["England", "Scotland", "Wales", "Northern Ireland"]);
export type UKCountry = z.infer<typeof UKCountrySchema>;

const text = (maximum: number) => z.string().min(1).max(maximum).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed.");
const httpsUrl = z.string().min(1).max(2048)
  .refine(value => !/[\s\u0000-\u001f\u007f]/.test(value), "URL whitespace and control characters are not allowed.")
  .pipe(z.url()).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !/\s/.test(value);
  } catch {
    return false;
  }
}, "Use an HTTPS URL without credentials or whitespace.");

export const CouncilContactSchema = z.object({
  id: text(80),
  name: text(180),
  website: httpsUrl,
  reportingUrl: httpsUrl,
  sourceUrl: httpsUrl,
  email: z.email().max(254).refine(value => !/[\r\n]/.test(value)).optional(),
}).strict().refine(isTrustedCouncilContact, "The contact does not match a verified authority and reporting route.");
export type CouncilContact = z.infer<typeof CouncilContactSchema>;

export const LocationCandidateSchema = z.object({
  id: text(120),
  label: text(400),
  location: z.object(position).strict(),
  postcode: text(10).nullable(),
  country: UKCountrySchema.nullable(),
  accuracy: z.enum(["address", "street", "place", "postcode", "pin"]),
  council: CouncilContactSchema.nullable(),
  warnings: z.array(text(500)).max(8),
}).strict();
export type LocationCandidate = z.infer<typeof LocationCandidateSchema>;

export const LocationLookupResultSchema = z.object({
  candidates: z.array(LocationCandidateSchema).max(3),
  attribution: text(300),
  warnings: z.array(text(500)).max(8),
}).strict();
export type LocationLookupResult = z.infer<typeof LocationLookupResultSchema>;
