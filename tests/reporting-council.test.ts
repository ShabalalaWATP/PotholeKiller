import { describe, expect, it } from "vitest";
import type { CouncilContact } from "../lib/location/schema";
import { prepareReport, ReportRecordSchema } from "../lib/reporting/report";
import { buildMailto, GENERIC_INSTRUCTIONS, HACKNEY_EMAIL, HACKNEY_INSTRUCTIONS, reportingInstructions } from "../lib/reporting/handoff";
import { readGameState } from "../lib/game/storage";
import { validReportInput } from "./game-fixtures";

/** Canonical published fixtures only; these tests send no requests or emails. */
const council: CouncilContact = {
  id: "E09000012",
  name: "London Borough of Hackney",
  website: "https://www.hackney.gov.uk/",
  reportingUrl: HACKNEY_INSTRUCTIONS,
  sourceUrl: HACKNEY_INSTRUCTIONS,
  email: HACKNEY_EMAIL,
};
const kent: CouncilContact = {
  id: "E10000016",
  name: "Kent County Council",
  website: "https://www.kent.gov.uk/",
  reportingUrl: GENERIC_INSTRUCTIONS,
  sourceUrl: "https://github.com/alphagov/local-links-manager/blob/main/data/local-authorities.csv",
};

describe("address-selected reporting authority", () => {
  it("includes the supplied council route, source and published contact in the reviewed draft", () => {
    const report = prepareReport(validReportInput({ councilContact: council, authority: "unknown" }));
    expect(report.councilContact).toEqual(council);
    expect(report.body).toContain(`Suggested highway authority: ${council.name}`);
    expect(report.body).toContain(`Official reporting route: ${council.reportingUrl}`);
    expect(report.body).toContain(`Published reporting email: ${council.email}`);
    expect(report.body).toContain(`Contact source: ${council.sourceUrl}`);
    expect(report.body).toContain("authority was suggested from the selected address or map location");
    expect(report.body).toContain("some roads are private, trunk roads or maintained by another authority");
    expect(report.body).not.toContain("Highway authority not confirmed");
    expect(reportingInstructions(report)).toBe(council.reportingUrl);
  });

  it("addresses the independently verified Hackney email and encodes the subject and complete body safely", () => {
    const report = prepareReport(validReportInput({
      councilContact: council,
      authority: "unknown",
      landmark: "Example Road & High Street?",
      notes: "A line break\nwith punctuation & ? = +.",
    }));
    const mailto = buildMailto(report)!;
    expect(mailto.startsWith(`mailto:${HACKNEY_EMAIL}?`)).toBe(true);
    const query = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1));
    expect([...query.keys()]).toEqual(["subject", "body"]);
    expect(query.get("subject")).toBe(report.subject);
    expect(query.get("body")).toBe(report.body);
  });

  it("uses the official route when no email is published, without guessing an inbox", () => {
    for (const authority of ["unknown", "hackney"] as const) {
      const report = prepareReport(validReportInput({ councilContact: kent, authority }));
      expect(buildMailto(report)).toBeNull();
      expect(reportingInstructions(report)).toBe(kent.reportingUrl);
      expect(report.body).not.toContain("Published reporting email:");
    }
  });

  it("always prevents addressed handoff for a fictional demonstration", () => {
    const report = prepareReport(validReportInput({ councilContact: council, isDemo: true }));
    expect(buildMailto(report)).toBeNull();
    expect(report.subject).toContain("DEMONSTRATION ONLY");
    expect(report.body.startsWith("DEMONSTRATION ONLY. FICTIONAL LOCATION. DO NOT SEND")).toBe(true);
  });

  it("retains legacy manual Hackney and generic routes for saved reports without a contact", () => {
    const report = prepareReport(validReportInput());
    const restored = readGameState({ getItem: () => JSON.stringify({ version: 1, captures: [report], rejectedScan: false }) });
    expect(restored.captures).toHaveLength(1);
    expect(restored.captures[0]).not.toHaveProperty("councilContact");
    expect(buildMailto(restored.captures[0])).toContain(`mailto:${HACKNEY_EMAIL}?`);
    expect(reportingInstructions(restored.captures[0])).toBe(HACKNEY_INSTRUCTIONS);
    expect(reportingInstructions({ authority: "unknown" })).toBe(GENERIC_INSTRUCTIONS);
  });

  it("retains selected contact metadata when reopening a saved report", () => {
    const report = prepareReport(validReportInput({ councilContact: council }));
    const restored = readGameState({ getItem: () => JSON.stringify({ version: 1, captures: [report], rejectedScan: false }) });
    expect(restored.captures[0].councilContact).toEqual(council);
    expect(reportingInstructions(restored.captures[0])).toBe(council.reportingUrl);
    expect(buildMailto(restored.captures[0])).toBe(buildMailto(report));
  });
});

describe("untrusted contact and email boundaries", () => {
  it.each([
    { reportingUrl: "javascript:alert(1)" },
    { reportingUrl: "http://example.gov.uk/report" },
    { reportingUrl: "not-a-url" },
    { website: "https://user:password@example.gov.uk/" },
    { sourceUrl: "https://example.gov.uk/\ncontact" },
    { reportingUrl: "https://example.gov.uk/space here" },
    { email: "roads@example.gov.uk\r\nBcc:someone@example.com" },
    { email: "roads@example.gov.uk?bcc=someone@example.com" },
    { email: "Roads <roads@example.gov.uk>" },
    { name: "Council\nFake instruction" },
    { id: "x".repeat(81) },
    { website: `https://example.gov.uk/${"a".repeat(2050)}` },
    { website: "https://attacker.example/" },
    { reportingUrl: "https://attacker.example/collect-location" },
    { sourceUrl: "https://attacker.example/contact" },
    { email: "collector@attacker.example" },
    { website: "https://127.0.0.1/" },
    { reportingUrl: "https://192.168.1.1/report" },
    { sourceUrl: "https://[::1]/contact" },
  ])("rejects malformed or injected contact metadata: %j", (changes) => {
    const invalid = { ...council, ...changes };
    expect(() => prepareReport(validReportInput({ councilContact: invalid }))).toThrow();
    const forged = { ...prepareReport(validReportInput()), councilContact: invalid };
    expect(ReportRecordSchema.safeParse(forged).success).toBe(false);
    expect(buildMailto(forged)).toBeNull();
    expect(reportingInstructions(forged)).toBe(GENERIC_INSTRUCTIONS);
  });

  it("rejects unverified email addresses attached to another real council", () => {
    const invalid = { ...kent, email: "roads@kent.gov.uk" };
    expect(() => prepareReport(validReportInput({ councilContact: invalid }))).toThrow();
    const forged = { ...prepareReport(validReportInput()), councilContact: invalid };
    expect(buildMailto(forged)).toBeNull();
  });

  it("does not restore a saved official council identity with an attacker-controlled contact", () => {
    const report = prepareReport(validReportInput({ councilContact: council }));
    const forged = { ...report, councilContact: { ...council, website: "https://attacker.example/", email: "collector@attacker.example" } };
    expect(readGameState({ getItem: () => JSON.stringify({ version: 1, captures: [forged], rejectedScan: false }) }).captures).toEqual([]);
  });

  it.each(["A street\nBcc:someone@example.com", "A street\rOther", "A street\u0000"])("rejects controls in the subject's street description", (landmark) => {
    expect(() => prepareReport(validReportInput({ landmark }))).toThrow();
  });

  it("refuses a directly forged email subject containing a header separator", () => {
    const report = prepareReport(validReportInput({ councilContact: council }));
    expect(buildMailto({ ...report, subject: "Report\r\nBcc:someone@example.com" })).toBeNull();
  });
});
