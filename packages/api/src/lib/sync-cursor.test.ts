import { describe, expect, it } from "vitest";

import { computeNextCursor } from "./sync-cursor";

describe("computeNextCursor", () => {
  it("returns null for an empty page", () => {
    expect(computeNextCursor([])).toBeNull();
  });

  it("returns the last row's updatedAt/id, not the first's", () => {
    const cursor = computeNextCursor([
      { id: "a", updatedAt: new Date("2026-01-01T00:00:00Z") },
      { id: "b", updatedAt: new Date("2026-01-02T00:00:00Z") },
    ]);
    expect(cursor).toEqual({
      updatedAt: new Date("2026-01-02T00:00:00Z").getTime(),
      id: "b",
    });
  });

  it("accepts string/number updatedAt values (raw DB rows)", () => {
    const cursor = computeNextCursor([
      { id: "a", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(cursor).toEqual({
      updatedAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
      id: "a",
    });
  });

  it("falls back to Date.now() when the last row has no updatedAt", () => {
    const before = Date.now();
    const cursor = computeNextCursor([{ id: "a", updatedAt: null }]);
    const after = Date.now();
    expect(cursor?.id).toBe("a");
    expect(cursor?.updatedAt).toBeGreaterThanOrEqual(before);
    expect(cursor?.updatedAt).toBeLessThanOrEqual(after);
  });

  it("never advances to Date.now() when rows are present (regression guard for G004)", () => {
    const stale = new Date("2020-01-01T00:00:00Z");
    const cursor = computeNextCursor([{ id: "a", updatedAt: stale }]);
    expect(cursor?.updatedAt).toBe(stale.getTime());
    expect(cursor?.updatedAt).toBeLessThan(Date.now());
  });
});
