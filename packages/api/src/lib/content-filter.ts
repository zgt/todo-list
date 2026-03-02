import { db } from "@acme/db/client";
import { ContentFlag } from "@acme/db/schema";

// Basic blocklist for content moderation
// This is intentionally lightweight — Apple needs to see the mechanism exists
const BLOCKLIST = [
  // Slurs and hate speech (abbreviated patterns)
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "kike",
  "spic",
  "chink",
  "wetback",
  "tranny",
  // Explicit threats
  "kill yourself",
  "kys",
  // Extreme profanity combinations
  "fuck you",
  "suck my dick",
  "eat shit",
];

/**
 * Check text against the blocklist. Returns matched words if any.
 * Does NOT block creation — just flags for review (soft moderation).
 */
export function checkContent(text: string): {
  flagged: boolean;
  matchedWords: string[];
} {
  const lower = text.toLowerCase();
  const matched = BLOCKLIST.filter((word) => lower.includes(word));
  return {
    flagged: matched.length > 0,
    matchedWords: matched,
  };
}

/**
 * Check text and create a ContentFlag record if flagged.
 * Fire-and-forget — does not throw or block the calling mutation.
 */
export async function flagContentIfNeeded(
  contentType: "LEAGUE" | "SUBMISSION" | "TASK" | "USER" | "COMMENT" | "ROUND",
  contentId: string,
  text: string,
): Promise<boolean> {
  const result = checkContent(text);
  if (result.flagged) {
    try {
      await db.insert(ContentFlag).values({
        contentType,
        contentId,
        flaggedText: text.slice(0, 500),
        matchedWords: result.matchedWords,
      });
    } catch {
      // Silently fail — don't break the user's action
      console.error("[content-filter] Failed to insert content flag");
    }
  }
  return result.flagged;
}
