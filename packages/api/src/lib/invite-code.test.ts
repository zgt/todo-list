import { describe, expect, it } from "vitest";

import { generateInviteCode } from "./invite-code";

describe("generateInviteCode", () => {
  it("returns a 32-character hex string (128 bits of entropy)", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[0-9a-f]{32}$/);
  });

  it("fits within the invite_code column length (varchar(64))", () => {
    const code = generateInviteCode();
    expect(code.length).toBeLessThanOrEqual(64);
  });

  it("produces unique codes across many calls", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateInviteCode));
    expect(codes.size).toBe(1000);
  });
});
