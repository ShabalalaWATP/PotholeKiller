import { databaseCommunityRepository } from "./database";
import { AuthUserIdSchema, ImageHashSchema, type ScanReceipt } from "./schema";

/** Called server-side only after an eligible, authenticated, non-demo live scan. */
export async function issueScanReceipt(userId: string, imageHash: string): Promise<ScanReceipt> {
  return databaseCommunityRepository.issueReceipt(
    AuthUserIdSchema.parse(userId), ImageHashSchema.parse(imageHash), new Date(),
  );
}
