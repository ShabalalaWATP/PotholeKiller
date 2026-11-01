import { z } from "zod";
import { RequestFailure } from "../security/errors";
import { councilContact, ROAD_OWNERSHIP_WARNING } from "./councils";
import { providerJson } from "./http";
import { extractPostcode, lookupPostcode, nearestPostcode, type PostcodeRecord } from "./postcodes";
import { LocationLookupResultSchema, type LocationCandidate, type LocationInput, type LocationLookupResult } from "./schema";

const ATTRIBUTION = "Address data © OpenStreetMap contributors (ODbL), via Photon. Postcode data: Postcodes.io. Council links: GOV.UK Local Links Manager.";
const PhotonFeatureSchema = z.object({
  properties: z.object({
    osm_type: z.string().max(20).optional(), osm_id: z.number().optional(),
    countrycode: z.string().max(2), type: z.string().max(40).optional(),
    name: z.string().max(180).optional(), housenumber: z.string().max(30).optional(),
    street: z.string().max(180).optional(), city: z.string().max(180).optional(),
    district: z.string().max(180).optional(), postcode: z.string().max(10).optional(),
  }),
  geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().min(-8.7).max(2.1), z.number().min(49.7).max(61.1)]) }),
});

async function enrich(candidate: LocationCandidate, record: PostcodeRecord | null): Promise<LocationCandidate> {
  if (!record) return { ...candidate, warnings: [...candidate.warnings, "Council lookup was unavailable. Confirm the authority using official reporting information."] };
  const contact = await councilContact(record);
  return {
    ...candidate, postcode: record.postcode, country: record.country, council: contact.council,
    warnings: [...candidate.warnings, ...contact.warnings, ROAD_OWNERSHIP_WARNING],
  };
}

async function postcodeCandidate(postcode: string): Promise<LocationCandidate[]> {
  const record = await lookupPostcode(postcode);
  if (!record || record.latitude === null || record.longitude === null) return [];
  return [await enrich({
    id: `postcode-${record.postcode.replace(/\s/g, "")}`,
    label: `${record.postcode}, ${record.admin_district ?? record.country}`,
    location: { lat: record.latitude, lng: record.longitude }, postcode: record.postcode,
    country: record.country, accuracy: "postcode", council: null,
    warnings: ["This is a postcode centre, not the exact defect. Move the pin to the road damage before confirming."],
  }, record)];
}

async function addressCandidates(query: string): Promise<LocationCandidate[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycode", "GB");
  url.searchParams.set("limit", "3");
  url.searchParams.set("lang", "en");
  const result = z.object({ features: z.array(z.unknown()).max(20) }).safeParse(await providerJson(url));
  if (!result.success) return [];
  const features: z.infer<typeof PhotonFeatureSchema>[] = [];
  for (const raw of result.data.features) {
    const feature = PhotonFeatureSchema.safeParse(raw);
    if (!feature.success || feature.data.properties.countrycode.toUpperCase() !== "GB") continue;
    features.push(feature.data);
    if (features.length === 3) break;
  }
  // Three suggestions are a fixed upper bound, not an unbounded geocoding batch.
  const candidates = await Promise.all(features.map(async ({ properties: parts, geometry }, index) => {
    const location = { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };
    const label = [...new Set([
      [parts.housenumber, parts.street].filter(Boolean).join(" ") || parts.name,
      parts.city || parts.district, parts.postcode,
    ].filter(Boolean))].join(", ").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 400);
    if (!label) return null;
    const postcode = parts.postcode ? extractPostcode(parts.postcode) : null;
    let record: PostcodeRecord | null = null;
    try { record = postcode ? await lookupPostcode(postcode) : await nearestPostcode(location); } catch { /* The suggested pin remains usable. */ }
    return enrich({
      id: `osm-${parts.osm_type ?? "place"}-${parts.osm_id ?? index}`,
      label, location, postcode, country: null, council: null,
      accuracy: parts.housenumber ? "address" : parts.street ? "street" : "place",
      warnings: ["Search results are approximate. Check the suggested place and move the pin to the exact defect."],
    }, record);
  }));
  return candidates.filter((candidate): candidate is LocationCandidate => candidate !== null);
}

export async function lookupLocation(input: LocationInput): Promise<LocationLookupResult> {
  let candidates: LocationCandidate[];
  if ("query" in input) {
    const postcode = extractPostcode(input.query);
    const postcodeOnly = postcode && input.query.replace(/\s/g, "").toUpperCase() === postcode.replace(/\s/g, "");
    if (postcodeOnly) candidates = await postcodeCandidate(postcode);
    else {
      try { candidates = await addressCandidates(input.query); }
      catch (error) {
        if (!postcode) throw error;
        candidates = [];
      }
      if (candidates.length === 0 && postcode) candidates = await postcodeCandidate(postcode);
    }
  } else {
    const record = await nearestPostcode(input);
    candidates = [await enrich({
      id: `pin-${input.lat.toFixed(6)}-${input.lng.toFixed(6)}`,
      label: record ? `Selected pin near ${record.postcode}, ${record.admin_district ?? record.country}` : "Selected map pin",
      location: input, postcode: record?.postcode ?? null, country: record?.country ?? null,
      accuracy: "pin", council: null,
      warnings: ["Council matching uses the nearest postcode and may be wrong at administrative boundaries. Confirm the responsible authority."],
    }, record)];
  }
  if (candidates.length === 0) {
    throw new RequestFailure(404, "LOCATION_NOT_FOUND", "No matching UK location was found. Add a town or full postcode, or place the map pin manually.");
  }
  return LocationLookupResultSchema.parse({ candidates, attribution: ATTRIBUTION, warnings: [] });
}
