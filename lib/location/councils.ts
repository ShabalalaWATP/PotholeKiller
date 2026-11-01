import { z } from "zod";
import directory from "./authorities.generated.json";
import { providerJson } from "./http";
import type { PostcodeRecord } from "./postcodes";
import { CouncilContactSchema, type CouncilContact } from "./schema";

const DIRECTORY_SOURCE = "https://github.com/alphagov/local-links-manager/blob/main/data/local-authorities.csv";
const HACKNEY_REPORT = "https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems";
const NI_REPORT = "https://www.nidirect.gov.uk/services/report-pothole-or-other-surface-defect";
const authorities = new Map(directory.authorities.map(authority => [authority.code, authority]));

export const ROAD_OWNERSHIP_WARNING = "Check the pin and highway authority before reporting. Trunk roads, TfL roads and private roads may have a different owner.";

export function authorityForPostcode(record: PostcodeRecord) {
  const district = authorities.get(record.codes.admin_district ?? "");
  const county = authorities.get(record.codes.admin_county ?? "");
  if (record.country === "England") {
    if (county?.tier === 1 && county.country === "England") return county;
    if (district?.tier === 2 && district.parent) {
      return directory.authorities.find(authority => authority.id === district.parent && authority.country === "England") ?? null;
    }
  }
  return district?.country === record.country ? district : null;
}

export async function councilContact(record: PostcodeRecord): Promise<{ council: CouncilContact | null; warnings: string[] }> {
  if (record.country === "Northern Ireland") {
    return {
      council: {
        id: "GB-NI-DFI", name: "DfI Roads", website: "https://www.infrastructure-ni.gov.uk/topics/roads",
        reportingUrl: NI_REPORT, sourceUrl: NI_REPORT,
      },
      warnings: ["Public-road defects in Northern Ireland are reported to DfI Roads, rather than the district council."],
    };
  }
  const authority = authorityForPostcode(record);
  if (!authority) {
    return { council: null, warnings: ["A current local highway authority could not be confirmed. Use the official national reporting information."] };
  }
  if (authority.code === "E09000012") {
    return {
      council: {
        id: authority.code, name: authority.name, website: "https://www.hackney.gov.uk/",
        reportingUrl: HACKNEY_REPORT, sourceUrl: HACKNEY_REPORT, email: "Highway.Inspectors@hackney.gov.uk",
      }, warnings: [],
    };
  }
  const fallback = record.country === "Scotland" ? "https://www.mygov.scot/report-pothole" : "https://www.gov.uk/report-pothole";
  const council: CouncilContact = {
    id: authority.code, name: authority.name, website: authority.website,
    reportingUrl: fallback, sourceUrl: DIRECTORY_SOURCE,
  };
  try {
    const url = new URL("https://local-links-manager.publishing.service.gov.uk/api/link");
    url.searchParams.set("authority_slug", authority.slug);
    // These service/interaction codes are published by GOV.UK's report-pothole content API.
    url.searchParams.set("lgsl", "557");
    url.searchParams.set("lgil", "17");
    const result = z.object({
      local_authority: z.object({ gss: z.string() }),
      local_interaction: z.object({ status: z.string(), url: z.string(), lgsl_code: z.literal(557), lgil_code: z.literal(17) }).optional(),
    }).safeParse(await providerJson(url));
    const interaction = result.success ? result.data.local_interaction : undefined;
    if (result.success && result.data.local_authority.gss === authority.code && interaction?.status === "ok") {
      const verified = CouncilContactSchema.safeParse({ ...council, reportingUrl: interaction.url, sourceUrl: url.href });
      if (verified.success) return { council: verified.data, warnings: [] };
    }
  } catch {
    // A provider outage must not remove the independently verified council website.
  }
  return {
    council,
    warnings: ["A current direct pothole form could not be verified. Use the official reporting information or council website. No reporting email has been invented."],
  };
}
