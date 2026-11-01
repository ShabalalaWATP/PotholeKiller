import { describe, expect, it } from "vitest";
import { defectAnalysisSchema, isCapturable, isCroissant, type DefectAnalysis } from "../lib/ai/schema";

const pothole: DefectAnalysis = {
  isRoadSurface: true,
  defectType: "pothole",
  visibleDamage: true,
  factualDescription: "A broken area of asphalt is visible, with loose material around its edge.",
  visibleObservations: ["Irregular broken surface"],
  photoQuality: "good",
  needsHumanReview: false,
  identifiedObject: "damaged road surface",
  funnyNickname: "Lord Potholious",
  humorousDescription: "Consumer of alloys. Enemy of suspension.",
};

describe("road-defect classification", () => {
  it.each(["pothole", "surface_crack", "surface_wear"] as const)("accepts visible %s after confident assessment", defectType => {
    expect(isCapturable({ ...pothole, defectType })).toBe(true);
  });

  it.each([
    { isRoadSurface: false },
    { visibleDamage: false },
    { photoQuality: "poor" },
    { needsHumanReview: true },
    { defectType: "not_road" },
    { defectType: "puddle_or_shadow" },
    { defectType: "uncertain" },
  ] as Partial<DefectAnalysis>[])("does not capture unsupported evidence %j", changes => {
    expect(isCapturable({ ...pothole, ...changes })).toBe(false);
  });

  it("allows a limited photograph when the visible damage is still clear", () => {
    expect(isCapturable({ ...pothole, photoQuality: "limited" })).toBe(true);
  });

  it("uses the pastry joke only for an actual croissant identification", () => {
    expect(isCroissant({ ...pothole, isRoadSurface: false, identifiedObject: "a Croissant pastry" })).toBe(true);
    expect(isCroissant({ ...pothole, isRoadSurface: false, identifiedObject: "bread roll" })).toBe(false);
    expect(isCroissant({ ...pothole, identifiedObject: "croissant" })).toBe(false);
    expect(isCroissant({ ...pothole, isRoadSurface: false, identifiedObject: "microcroissant-shaped cloud" })).toBe(false);
  });

  it("validates all required model fields and rejects unknown or oversized output", () => {
    expect(defectAnalysisSchema.parse(pothole)).toEqual(pothole);
    expect(defectAnalysisSchema.safeParse({ ...pothole, defectType: "dangerous" }).success).toBe(false);
    expect(defectAnalysisSchema.safeParse({ ...pothole, depth: "10cm" }).success).toBe(false);
    expect(defectAnalysisSchema.safeParse({ ...pothole, factualDescription: "x".repeat(1601) }).success).toBe(false);
    const missing = { ...pothole } as Partial<DefectAnalysis>;
    delete missing.identifiedObject;
    expect(defectAnalysisSchema.safeParse(missing).success).toBe(false);
  });
});
