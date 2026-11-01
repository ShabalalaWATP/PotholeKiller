import { z } from "zod";
import { DefectAnalysisSchema, isCapturable } from "../ai/schema";
import { MonsterProfileSchema, monsterPower } from "../game/power";
import { CouncilContactSchema } from "../location/schema";

export const LocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export const AuthoritySchema = z.enum(["hackney", "unknown"]);
export const ReportStatusSchema = z.enum([
  "draft_prepared",
  "email_handoff",
  "submitted_by_user",
]);
export const CreatureSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300),
  family: z.enum(["gremlin", "crackling", "puddle", "beast"]),
  rarity: z.enum(["Common", "Rare", "Epic"]),
});

const imageHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const descriptionSchema = z.string().trim().min(10).max(2000);
const notesSchema = z.string().trim().max(1000);
const landmarkSchema = z.string().trim().max(200).refine(
  (value) => !/[\u0000-\u001f\u007f]/.test(value),
  "Keep the street or landmark on one line.",
);

export const ReportInputSchema = z.object({
  analysis: DefectAnalysisSchema,
  description: descriptionSchema,
  notes: notesSchema,
  landmark: landmarkSchema,
  location: LocationSchema,
  locationConfirmed: z.literal(true),
  contentReviewed: z.literal(true),
  authority: AuthoritySchema.default("unknown"),
  councilContact: CouncilContactSchema.optional(),
  scanReceiptId: z.uuid().optional(),
  isDemo: z.boolean(),
  imageHash: imageHashSchema,
  monsterProfile: MonsterProfileSchema,
  preparedAt: z.iso.datetime().optional(),
});

export const ReportRecordSchema = z.object({
  id: z.string().regex(/^capture-[a-f0-9]{64}$/),
  imageHash: imageHashSchema,
  monsterProfile: MonsterProfileSchema,
  analysis: DefectAnalysisSchema,
  creature: CreatureSchema,
  location: LocationSchema,
  locationConfirmed: z.literal(true),
  contentReviewed: z.literal(true),
  description: descriptionSchema,
  notes: notesSchema,
  landmark: landmarkSchema,
  authority: AuthoritySchema,
  councilContact: CouncilContactSchema.optional(),
  scanReceiptId: z.uuid().optional(),
  isDemo: z.boolean(),
  subject: z.string().min(1).max(400),
  body: z.string().min(1).max(10000),
  preparedAt: z.iso.datetime(),
  status: ReportStatusSchema,
}).refine((record) => record.id === `capture-${record.imageHash}`, {
  message: "Report identity must match its photograph fingerprint.",
}).refine((record) => isCapturable(record.analysis), {
  message: "Only a confidently identified visible road defect can be captured.",
}).refine((record) => !record.isDemo || record.status === "draft_prepared", {
  message: "Example reports cannot be handed off or marked submitted.",
}).refine((record) => record.monsterProfile.firstObservedOn === null ||
  record.monsterProfile.firstObservedOn <= record.preparedAt.slice(0, 10), {
  message: "The first-noticed date cannot be after report preparation.",
  path: ["monsterProfile", "firstObservedOn"],
});

export type ReportInput = z.input<typeof ReportInputSchema>;
export type ReportRecord = z.infer<typeof ReportRecordSchema>;
export type Creature = z.infer<typeof CreatureSchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export type ReportLocation = z.infer<typeof LocationSchema>;

export const DEFECT_LABELS = {
  pothole: "Suspected pothole",
  surface_crack: "Road surface crack",
  surface_wear: "Road surface wear",
  puddle_or_shadow: "Puddle or shadow",
  not_road: "Not a road surface",
  uncertain: "Uncertain",
} as const;

/** Cosmetic rarity and artwork are independent of defect severity. */
export function creatureForAnalysis(
  analysis: ReportRecord["analysis"],
  imageHash: string,
): Creature {
  const seed = Number.parseInt(imageHash.slice(0, 8), 16);
  const families = ["gremlin", "beast", "puddle"] as const;
  return {
    name: analysis.funnyNickname.trim(),
    description: analysis.humorousDescription.trim(),
    family: analysis.defectType === "surface_crack"
      ? "crackling"
      : families[seed % families.length],
    rarity: seed % 10 === 0 ? "Epic" : seed % 3 === 0 ? "Rare" : "Common",
  };
}

export function prepareReport(input: ReportInput): ReportRecord {
  const data = ReportInputSchema.parse(input);
  if (!isCapturable(data.analysis)) {
    throw new Error("This photograph needs a clearer road-defect assessment before capture.");
  }

  const preparedAt = data.preparedAt ?? new Date().toISOString();
  // Validate relative dates before preparing either the game award or council draft.
  monsterPower(data.monsterProfile, preparedAt);
  const defect = DEFECT_LABELS[data.analysis.defectType];
  const subject = `${data.isDemo ? "DEMONSTRATION ONLY: " : ""}${defect}${data.landmark ? ` near ${data.landmark}` : ""}`;
  const body = [
    ...(data.isDemo ? ["DEMONSTRATION ONLY. FICTIONAL LOCATION. DO NOT SEND TO A COUNCIL.", ""] : []),
    "Road surface defect report, prepared for human review",
    "",
    `Suspected defect type: ${defect}`,
    `Reviewed description: ${data.description}`,
    ...(data.monsterProfile.extent === "unknown" ? [] : [
      `User-reported apparent extent: ${data.monsterProfile.extent} (qualitative estimate; no measurements supplied).`,
    ]),
    ...(data.monsterProfile.firstObservedOn === null ? [] : [
      `First noticed by user: ${data.monsterProfile.firstObservedOn} (self-reported; does not establish defect age, council notification or repair history).`,
    ]),
    "",
    `User-confirmed map pin: ${data.location.lat.toFixed(6)}, ${data.location.lng.toFixed(6)}`,
    `Street or landmark: ${data.landmark || "Not supplied"}`,
    `Additional user observations: ${data.notes || "None supplied"}`,
    `Prepared: ${preparedAt}`,
    "",
    "Please manually attach the original photograph before sending.",
    "The image assessment is a visual suggestion, not an engineering inspection. No precise dimensions or depth have been measured.",
    ...(data.councilContact ? [
      `Suggested highway authority: ${data.councilContact.name}`,
      `Official reporting route: ${data.councilContact.reportingUrl}`,
      ...(data.councilContact.email ? [`Published reporting email: ${data.councilContact.email}`] : []),
      `Contact source: ${data.councilContact.sourceUrl}`,
      "The authority was suggested from the selected address or map location. Please verify that it maintains this road; some roads are private, trunk roads or maintained by another authority.",
    ] : [data.authority === "hackney"
      ? "Hackney Council was selected by the user. Please verify that it maintains this road; some roads are private or maintained by another authority."
      : "Highway authority not confirmed. Please verify the responsible authority before submitting this draft."]),
    "Status: report draft prepared. No submission, receipt, acknowledgement or repair has been verified.",
  ].join("\n");

  return ReportRecordSchema.parse({
    ...data,
    id: `capture-${data.imageHash}`,
    creature: creatureForAnalysis(data.analysis, data.imageHash),
    subject,
    body,
    preparedAt,
    status: "draft_prepared",
  });
}
