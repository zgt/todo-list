import { describe, expect, it } from "vitest";

import { isReminderDue } from "./reminders";

describe("isReminderDue (G006)", () => {
  const now = new Date(2026, 0, 15, 12, 0, 0); // Jan 15, 2026, 12:00:00

  it("returns false when reminderAt is null", () => {
    expect(isReminderDue(null, 15, now)).toBe(false);
  });

  it("is due exactly at reminderAt when offset is 0", () => {
    expect(isReminderDue(now, 0, now)).toBe(true);
  });

  it("is not due before reminderAt when offset is 0", () => {
    const reminderAt = new Date(now.getTime() + 60_000);
    expect(isReminderDue(reminderAt, 0, now)).toBe(false);
  });

  it("fires early by the offset amount (due when now >= reminderAt - offset)", () => {
    const reminderAt = new Date(now.getTime() + 15 * 60_000); // 15 min from now
    // With a 15-minute offset, it should already be due right now.
    expect(isReminderDue(reminderAt, 15, now)).toBe(true);
    // With a 10-minute offset it should not be due yet.
    expect(isReminderDue(reminderAt, 10, now)).toBe(false);
  });

  it("is still due when reminderAt (minus offset) is well in the past", () => {
    const reminderAt = new Date(now.getTime() - 60 * 60_000); // 1 hour ago
    expect(isReminderDue(reminderAt, 15, now)).toBe(true);
  });

  it("respects the largest supported offset (1 day = 1440 minutes)", () => {
    const reminderAt = new Date(now.getTime() + 1440 * 60_000); // 1 day from now
    expect(isReminderDue(reminderAt, 1440, now)).toBe(true);
    expect(isReminderDue(reminderAt, 1439, now)).toBe(false);
  });
});
