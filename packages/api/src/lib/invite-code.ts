import { randomBytes } from "node:crypto";

/**
 * Generates a task-list invite code with 128 bits of entropy (32 hex
 * chars), so brute-forcing a valid code is infeasible even without the
 * join-attempt rate limit in `joinByInvite`.
 */
export function generateInviteCode(): string {
  return randomBytes(16).toString("hex");
}
