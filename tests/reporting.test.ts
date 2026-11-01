import { describe, expect, it, vi } from "vitest";
import { creatureForAnalysis, prepareReport, ReportRecordSchema } from "../lib/reporting/report";
import { buildMailto, GENERIC_INSTRUCTIONS, HACKNEY_EMAIL, HACKNEY_INSTRUCTIONS, reportingInstructions, reportStatusLabel } from "../lib/reporting/handoff";
import { validReportInput } from "./game-fixtures";

describe("human-reviewed report preparation", () => {
  it("keeps a bounded reporter name in the private draft and defaults older records safely", () => {
    const report = prepareReport(validReportInput({ reporterName: "  Alex O'Neil  " }));
    expect(report.reporterName).toBe("Alex O'Neil");
    expect(report.body).toContain("Reported by: Alex O'Neil");
    for (const reporterName of ["A", "a".repeat(81), "Alex\r\nBcc:someone@example.com"]) {
      expect(() => prepareReport(validReportInput({ reporterName }))).toThrow();
    }
    const old = { ...report } as Record<string, unknown>;
    delete old.reporterName;
    expect(ReportRecordSchema.parse(old).reporterName).toBe("Not supplied");
  });
  it("defaults publication consent off, preserves a valid real target and rejects mock publication", () => {
    const legacy = prepareReport(validReportInput());
    expect(legacy.publishToMap).toBe(false);
    const target = "e98a2d49-58f2-4563-b6c7-5331b34a802b";
    const shared = prepareReport(validReportInput({ publishToMap: true, communityIssueId: target }));
    expect(shared.communityIssueId).toBe(target);
    expect(shared.publishToMap).toBe(true);
    expect(shared.body).not.toContain("publishToMap");
    expect(() => prepareReport(validReportInput({ isDemo: true, publishToMap: true }))).toThrow();
    expect(() => prepareReport(validReportInput({ communityIssueId: "demo-issue-001" }))).toThrow();
    const oldStored = { ...legacy } as Record<string, unknown>;
    delete oldStored.publishToMap;
    expect(ReportRecordSchema.parse(oldStored).publishToMap).toBe(false);
  });
  it("includes reviewed facts, confirmed coordinates, preparation date and manual attachment reminder", () => {
    const report = prepareReport(validReportInput());
    expect(report.status).toBe("draft_prepared");
    expect(report.id).toBe(`capture-${"a".repeat(64)}`);
    expect(report.body).toContain("51.545000, -0.055000");
    expect(report.body).toContain("Reviewed description: A broken patch");
    expect(report.body).not.toContain("Irregular broken edges");
    expect(report.body).toContain("Beside the cycle lane.");
    expect(report.body).toContain("2026-11-01T13:00:00.000Z");
    expect(report.body).toContain("manually attach the original photograph");
    expect(report.body).toContain("No submission, receipt, acknowledgement or repair has been verified");
    expect(report.body).not.toContain("Lord Potholious");
    expect(report.body).not.toContain("Enemy of suspension");
    expect(report.subject).toBe("Suspected pothole near Example Street");
    expect(report.body).toContain("some roads are private or maintained by another authority");
  });

  it("keeps the corrected user description separate from the model's original wording", () => {
    const report = prepareReport(validReportInput({ description: "The broken surface is next to a drain." }));
    expect(report.description).toBe("The broken surface is next to a drain.");
    expect(report.analysis.factualDescription).toContain("broken patch of asphalt");
    expect(report.body).toContain("Reviewed description: The broken surface is next to a drain.");
  });

  it("omits unreviewed model measurements and safety claims from the outgoing report", () => {
    const input = validReportInput();
    input.analysis.visibleObservations = ["The defect is exactly 50 cm deep and officially unsafe."];
    const report = prepareReport(input);
    expect(report.body).not.toContain("50 cm");
    expect(report.body).not.toContain("officially unsafe");
    expect(report.body).toContain(input.description);
  });

  it("does not infer authority or location from the photo", () => {
    const input = validReportInput({ landmark: "", notes: "", authority: undefined, location: { lat: -35.1, lng: 149.2 } });
    const report = prepareReport(input);
    expect(report.authority).toBe("unknown");
    expect(report.body).toContain("Highway authority not confirmed");
    expect(report.body).toContain("-35.100000, 149.200000");
    expect(report.body).toContain("Street or landmark: Not supplied");
    expect(report.body).toContain("Additional user observations: None supplied");
    expect(report.subject).toBe("Suspected pothole");
  });

  it("uses the actual preparation time when no date is supplied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T14:15:00.000Z"));
    try {
      expect(prepareReport(validReportInput({ preparedAt: undefined })).preparedAt).toBe("2026-11-01T14:15:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["unconfirmed location", { locationConfirmed: false }],
    ["unreviewed content", { contentReviewed: false }],
    ["empty description", { description: "   " }],
    ["excessive description", { description: "x".repeat(2001) }],
    ["excessive note", { notes: "x".repeat(1001) }],
    ["excessive landmark", { landmark: "x".repeat(201) }],
    ["invalid latitude", { location: { lat: 91, lng: 0 } }],
    ["invalid longitude", { location: { lat: 0, lng: -181 } }],
    ["non-finite coordinates", { location: { lat: Number.NaN, lng: 0 } }],
    ["invalid date", { preparedAt: "yesterday" }],
    ["invalid image fingerprint", { imageHash: "photo.jpg" }],
  ])("rejects %s", (_name, overrides) => {
    expect(() => prepareReport(validReportInput(overrides as never))).toThrow();
  });

  it.each([
    { isRoadSurface: false },
    { visibleDamage: false },
    { defectType: "not_road" as const },
    { defectType: "puddle_or_shadow" as const },
    { defectType: "uncertain" as const },
    { needsHumanReview: true },
    { photoQuality: "poor" as const },
  ])("does not reward an ineligible assessment: %j", (change) => {
    const input = validReportInput();
    expect(() => prepareReport({ ...input, analysis: { ...input.analysis, ...change } })).toThrow();
  });

  it("accepts genuine visible cracks and wear as well as potholes", () => {
    const input = validReportInput();
    for (const defectType of ["surface_crack", "surface_wear"] as const) {
      expect(prepareReport({ ...input, analysis: { ...input.analysis, defectType } }).analysis.defectType).toBe(defectType);
    }
  });

  it("marks examples as fictional and prohibits falsified record identities or demo submission status", () => {
    const report = prepareReport(validReportInput({ isDemo: true }));
    expect(report.body.startsWith("DEMONSTRATION ONLY. FICTIONAL LOCATION. DO NOT SEND")).toBe(true);
    expect(report.subject).toContain("DEMONSTRATION ONLY");
    expect(ReportRecordSchema.safeParse({ ...report, id: `capture-${"b".repeat(64)}` }).success).toBe(false);
    expect(ReportRecordSchema.safeParse({ ...report, status: "submitted_by_user" }).success).toBe(false);
  });
});

describe("cosmetic creature assignment", () => {
  it("is deterministic and independent of measurements or danger", () => {
    const input = validReportInput();
    const first = creatureForAnalysis(input.analysis, input.imageHash);
    expect(creatureForAnalysis(input.analysis, input.imageHash)).toEqual(first);
    expect(first.name).toBe("Lord Potholious");
    expect(first.description).toContain("Consumer of alloys");
    const hash = (seed: number) => seed.toString(16).padStart(8, "0") + "a".repeat(56);
    expect(creatureForAnalysis(input.analysis, hash(0))).toMatchObject({ rarity: "Epic", family: "gremlin" });
    expect(creatureForAnalysis(input.analysis, hash(3)).rarity).toBe("Rare");
    expect(creatureForAnalysis(input.analysis, hash(1))).toMatchObject({ rarity: "Common", family: "beast" });
    expect(creatureForAnalysis(input.analysis, hash(2)).family).toBe("puddle");
    expect(creatureForAnalysis({ ...input.analysis, defectType: "surface_crack" }, hash(1)).family).toBe("crackling");
  });
});

describe("explicit reporting handoff", () => {
  it("encodes the entire reviewed report without introducing mail header fields", () => {
    const report = prepareReport(validReportInput({ notes: "Ampersand & question ? plus + and line\nbreak" }));
    const url = buildMailto(report);
    expect(url).toContain(`mailto:${HACKNEY_EMAIL}?`);
    const query = new URLSearchParams(url!.split("?")[1]);
    expect([...query.keys()]).toEqual(["subject", "body"]);
    expect(query.get("body")).toBe(report.body);
    expect(query.get("subject")).toBe(report.subject);
    expect(reportingInstructions(report)).toBe(HACKNEY_INSTRUCTIONS);
  });

  it("never addresses demo reports or invents a contact outside the pilot", () => {
    expect(buildMailto(prepareReport(validReportInput({ isDemo: true })))).toBeNull();
    const unknown = prepareReport(validReportInput({ authority: "unknown" }));
    expect(buildMailto(unknown)).toBeNull();
    expect(reportingInstructions(unknown)).toBe(GENERIC_INSTRUCTIONS);
  });

  it.each([
    ["draft_prepared", "Report draft prepared"],
    ["email_handoff", "Email handoff requested"],
    ["submitted_by_user", "Submitted, recorded by you"],
  ] as const)("labels %s without claiming receipt or repair", (status, label) => {
    expect(reportStatusLabel({ status })).toBe(label);
  });
});
