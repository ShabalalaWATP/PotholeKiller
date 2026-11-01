import directory from "./authorities.generated.json";

const authorities = new Map(directory.authorities.map(authority => [authority.code, authority]));
const DIRECTORY_SOURCE = "https://github.com/alphagov/local-links-manager/blob/main/data/local-authorities.csv";
const HACKNEY_REPORT = "https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems";
const NI_REPORT = "https://www.nidirect.gov.uk/services/report-pothole-or-other-surface-defect";

type Contact = {
  id: string; name: string; website: string; reportingUrl: string; sourceUrl: string; email?: string;
};

function sameCouncilHost(url: URL, website: URL): boolean {
  const host = website.hostname.replace(/^www\./, "");
  return url.protocol === "https:" && !url.port && !url.username && !url.password &&
    (url.hostname === host || url.hostname.endsWith(`.${host}`));
}

/** Revalidate persisted contacts against known identities, not just URL syntax. */
export function isTrustedCouncilContact(contact: Contact): boolean {
  try {
    if (contact.id === "GB-NI-DFI") {
      return contact.name === "DfI Roads" && contact.website === "https://www.infrastructure-ni.gov.uk/topics/roads" &&
        contact.reportingUrl === NI_REPORT && contact.sourceUrl === NI_REPORT && !contact.email;
    }
    const authority = authorities.get(contact.id);
    if (!authority || authority.country === "Northern Ireland" || authority.name !== contact.name) return false;
    const website = new URL(contact.website);
    if (website.href !== new URL(authority.website).href) return false;
    if (contact.id === "E09000012") {
      return contact.reportingUrl === HACKNEY_REPORT && contact.sourceUrl === HACKNEY_REPORT &&
        (!contact.email || contact.email.toLowerCase() === "highway.inspectors@hackney.gov.uk");
    }
    if (contact.email) return false;
    const reporting = new URL(contact.reportingUrl);
    const fallback = authority.country === "Scotland" ? "https://www.mygov.scot/report-pothole" : "https://www.gov.uk/report-pothole";
    if (reporting.href !== fallback && !sameCouncilHost(reporting, website)) return false;
    const source = new URL(contact.sourceUrl);
    const serviceSource = source.origin === "https://local-links-manager.publishing.service.gov.uk" && source.pathname === "/api/link" &&
      source.searchParams.size === 3 && source.searchParams.get("authority_slug") === authority.slug &&
      source.searchParams.get("lgsl") === "557" && source.searchParams.get("lgil") === "17" && !source.hash;
    return source.href === DIRECTORY_SOURCE || serviceSource || sameCouncilHost(source, website);
  } catch {
    return false;
  }
}
