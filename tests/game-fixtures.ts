import type { ReportInput } from "../lib/reporting/report";

export function validReportInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    analysis: {
      isRoadSurface: true,
      defectType: "pothole",
      visibleDamage: true,
      factualDescription: "A broken patch of asphalt is visible in the road surface.",
      visibleObservations: ["Irregular broken edges", "Loose surface material"],
      photoQuality: "good",
      needsHumanReview: false,
      funnyNickname: "Lord Potholious",
      humorousDescription: "Consumer of alloys. Enemy of suspension.",
      identifiedObject: "pothole",
    },
    description: "A broken patch of asphalt is visible in the road surface.",
    notes: "Beside the cycle lane.",
    landmark: "Example Street",
    location: { lat: 51.545, lng: -0.055 },
    locationConfirmed: true,
    contentReviewed: true,
    authority: "hackney",
    isDemo: false,
    imageHash: "a".repeat(64),
    preparedAt: "2026-11-01T13:00:00.000Z",
    ...overrides,
  };
}
