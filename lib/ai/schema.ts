import { z } from "zod";

/** Factual observations are kept separate from the cosmetic game character. */
export const defectAnalysisSchema = z.object({
  isRoadSurface: z.boolean(),
  defectType: z.enum([
    "pothole", "surface_crack", "surface_wear", "puddle_or_shadow", "not_road", "uncertain",
  ]),
  visibleDamage: z.boolean(),
  factualDescription: z.string().min(1).max(1600),
  visibleObservations: z.array(z.string().min(1).max(300)).max(8),
  photoQuality: z.enum(["good", "limited", "poor"]),
  needsHumanReview: z.boolean(),
  identifiedObject: z.string().min(1).max(100),
  funnyNickname: z.string().min(1).max(60),
  humorousDescription: z.string().min(1).max(180),
}).strict();

export type DefectAnalysis = z.infer<typeof defectAnalysisSchema>;
// PascalCase alias for consumers that use schema names alongside model types.
export const DefectAnalysisSchema = defectAnalysisSchema;

/** Ambiguous, poor-quality and unrelated photographs cannot earn a capture. */
export function isCapturable(analysis: DefectAnalysis): boolean {
  return analysis.isRoadSurface && analysis.visibleDamage &&
    ["pothole", "surface_crack", "surface_wear"].includes(analysis.defectType) &&
    analysis.photoQuality !== "poor" && !analysis.needsHumanReview;
}

/** The pastry joke is only used when the assessment actually identifies one. */
export function isCroissant(analysis: DefectAnalysis): boolean {
  return !isCapturable(analysis) && /\bcroissant\b/i.test(analysis.identifiedObject);
}
