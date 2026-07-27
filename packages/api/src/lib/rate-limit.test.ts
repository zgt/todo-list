import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts up to the limit", () => {
    const key = "test:within-limit";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5)).toBe(true);
    }
  });

  it("blocks once the limit is exceeded", () => {
    const key = "test:over-limit";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5);
    }
    expect(checkRateLimit(key, 5)).toBe(false);
  });

  it("allows attempts again once the window has passed", () => {
    const key = "test:window-expiry";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    expect(checkRateLimit(key, 5, 60_000)).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(key, 5, 60_000)).toBe(true);
  });

  it("tracks a sliding window rather than a fixed one", () => {
    const key = "test:sliding-window";
    const limit = 2;
    // Fill both slots, spaced apart: one at t=0, one at t=500
    checkRateLimit(key, limit, 1000);
    vi.advanceTimersByTime(500);
    checkRateLimit(key, limit, 1000);

    // By t=1001 the t=0 attempt has aged out of the window, but the
    // t=500 one hasn't yet — exactly one slot should be free
    vi.advanceTimersByTime(501); // now at t=1001
    expect(checkRateLimit(key, limit, 1000)).toBe(true);
    expect(checkRateLimit(key, limit, 1000)).toBe(false);
  });

  it("isolates limits per key", () => {
    const keyA = "test:isolation-a";
    const keyB = "test:isolation-b";

    for (let i = 0; i < 3; i++) {
      checkRateLimit(keyA, 3);
    }
    expect(checkRateLimit(keyA, 3)).toBe(false);

    // A different key should be unaffected
    expect(checkRateLimit(keyB, 3)).toBe(true);
  });
});
