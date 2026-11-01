import type { ReportRecord } from "./report";

export const HACKNEY_EMAIL = "Highway.Inspectors@hackney.gov.uk";
export const HACKNEY_INSTRUCTIONS = "https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems";
export const GENERIC_INSTRUCTIONS = "https://www.gov.uk/report-pothole";

export function reportingInstructions(record: Pick<ReportRecord, "authority">): string {
  return record.authority === "hackney" ? HACKNEY_INSTRUCTIONS : GENERIC_INSTRUCTIONS;
}

/** Opening a mail client is a handoff only; it cannot verify that email was sent. */
export function buildMailto(record: ReportRecord): string | null {
  if (record.isDemo || record.authority !== "hackney") return null;
  return `mailto:${HACKNEY_EMAIL}?subject=${encodeURIComponent(record.subject)}&body=${encodeURIComponent(record.body)}`;
}

export function reportStatusLabel(record: Pick<ReportRecord, "status">): string {
  if (record.status === "email_handoff") return "Email handoff requested";
  if (record.status === "submitted_by_user") return "Submitted, recorded by you";
  return "Report draft prepared";
}
