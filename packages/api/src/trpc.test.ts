import { describe, expect, it } from "vitest";

import { isAdminUserId } from "./trpc";

describe("isAdminUserId", () => {
  it("returns false when the env var is unset", () => {
    expect(isAdminUserId("user-1", undefined)).toBe(false);
  });

  it("returns false when the env var is empty", () => {
    expect(isAdminUserId("user-1", "")).toBe(false);
  });

  it("returns false when the env var is only whitespace/commas", () => {
    expect(isAdminUserId("user-1", " , ,")).toBe(false);
  });

  it("returns true when the user id is in the list", () => {
    expect(isAdminUserId("user-1", "user-1,user-2")).toBe(true);
  });

  it("trims whitespace around each id", () => {
    expect(isAdminUserId("user-2", "user-1, user-2 , user-3")).toBe(true);
  });

  it("returns false when the user id is not in the list", () => {
    expect(isAdminUserId("user-4", "user-1,user-2,user-3")).toBe(false);
  });

  it("does not partial-match a substring of an admin id", () => {
    expect(isAdminUserId("user-1", "user-10,user-11")).toBe(false);
  });
});
