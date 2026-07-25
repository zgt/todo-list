import { describe, expect, it } from "vitest";

import { getNextDueDate } from "./task";

describe("getNextDueDate (F045)", () => {
  describe("daily / weekly / custom — plain day arithmetic", () => {
    it("daily advances by `interval` days", () => {
      const result = getNextDueDate(new Date(2026, 0, 15, 9, 0), "daily", 3);
      expect(result).toEqual(new Date(2026, 0, 18, 9, 0));
    });

    it("weekly advances by 7 * interval days", () => {
      const result = getNextDueDate(new Date(2026, 0, 1, 9, 0), "weekly", 2);
      expect(result).toEqual(new Date(2026, 0, 15, 9, 0));
    });

    it("custom treats interval as a day count", () => {
      const result = getNextDueDate(new Date(2026, 0, 1), "custom", 10);
      expect(result).toEqual(new Date(2026, 0, 11));
    });

    it("falls back to day arithmetic for an unknown rule", () => {
      const result = getNextDueDate(new Date(2026, 0, 1), "bogus", 5);
      expect(result).toEqual(new Date(2026, 0, 6));
    });

    it("uses `new Date()` as the base when currentDueDate is null", () => {
      const before = Date.now();
      const result = getNextDueDate(null, "daily", 1);
      const after = Date.now();
      // Should land ~1 day after "now" at call time, whichever "now" we hit.
      expect(result.getTime()).toBeGreaterThanOrEqual(
        before + 24 * 60 * 60 * 1000 - 1000,
      );
      expect(result.getTime()).toBeLessThanOrEqual(
        after + 24 * 60 * 60 * 1000 + 1000,
      );
    });
  });

  describe("monthly — day-of-month clamping instead of overflow", () => {
    it("Jan 31 + 1 month lands on Feb 28 (non-leap year), not Mar 3", () => {
      const result = getNextDueDate(
        new Date(2025, 0, 31, 10, 30),
        "monthly",
        1,
      );
      expect(result).toEqual(new Date(2025, 1, 28, 10, 30));
    });

    it("Jan 31 + 1 month lands on Feb 29 in a leap year", () => {
      const result = getNextDueDate(
        new Date(2024, 0, 31, 10, 30),
        "monthly",
        1,
      );
      expect(result).toEqual(new Date(2024, 1, 29, 10, 30));
    });

    it("30th monthly through February clamps, then does not jump back to 30 (documented drift limitation)", () => {
      // Jan 30 -> Feb (28, non-leap) -> Mar: previous-occurrence anchoring
      // means March lands on the 28th, not back on the 30th.
      const jan30 = new Date(2025, 0, 30);
      const feb = getNextDueDate(jan30, "monthly", 1);
      expect(feb).toEqual(new Date(2025, 1, 28));

      const mar = getNextDueDate(feb, "monthly", 1);
      expect(mar).toEqual(new Date(2025, 2, 28));
    });

    it("preserves the day when the target month is long enough", () => {
      const result = getNextDueDate(
        new Date(2025, 2, 31), // Mar 31
        "monthly",
        1,
      );
      // April has 30 days
      expect(result).toEqual(new Date(2025, 3, 30));
    });

    it("supports interval > 1", () => {
      const result = getNextDueDate(new Date(2025, 0, 31), "monthly", 2);
      // Jan 31 + 2 months -> March 31 (31 days, no clamp needed)
      expect(result).toEqual(new Date(2025, 2, 31));
    });
  });

  describe("yearly — day clamping for Feb 29 anchors", () => {
    it("Feb 29 (leap year) + 1 year clamps to Feb 28 in a non-leap year", () => {
      const result = getNextDueDate(
        new Date(2024, 1, 29, 12, 0),
        "yearly",
        1,
      );
      expect(result).toEqual(new Date(2025, 1, 28, 12, 0));
    });

    it("Feb 29 + 4 years lands back on Feb 29 in the next leap year", () => {
      const result = getNextDueDate(new Date(2024, 1, 29), "yearly", 4);
      expect(result).toEqual(new Date(2028, 1, 29));
    });

    it("preserves month/day for a normal (non-Feb-29) anchor", () => {
      const result = getNextDueDate(new Date(2025, 5, 15), "yearly", 1);
      expect(result).toEqual(new Date(2026, 5, 15));
    });
  });
});
