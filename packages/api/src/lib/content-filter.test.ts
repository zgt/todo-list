import { describe, expect, it } from "vitest";

import { checkContent } from "./content-filter";

describe("checkContent", () => {
  it("does not flag clean text", () => {
    const result = checkContent("This user was unhelpful in the shared list");
    expect(result.flagged).toBe(false);
    expect(result.matchedWords).toEqual([]);
  });

  it("flags report details containing blocklisted phrases", () => {
    const result = checkContent(
      "They told me to kys in the comments, awful behavior",
    );
    expect(result.flagged).toBe(true);
    expect(result.matchedWords).toContain("kys");
  });

  it("is case-insensitive", () => {
    const result = checkContent("FUCK YOU for real");
    expect(result.flagged).toBe(true);
    expect(result.matchedWords).toContain("fuck you");
  });

  it("can match multiple blocklisted phrases in one string", () => {
    const result = checkContent("kys, and also eat shit");
    expect(result.flagged).toBe(true);
    expect(result.matchedWords).toEqual(
      expect.arrayContaining(["kys", "eat shit"]),
    );
  });
});
