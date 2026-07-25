import { describe, expect, it } from "vitest";

import {
  SyncPullInputSchema,
  SyncPushInputSchema,
  SyncPushTaskSchema,
} from "./sync";

const baseData = {
  updatedAt: new Date(),
  localVersion: 1,
  serverVersion: 1,
};

// zod v4's `.uuid()` enforces RFC 4122 (version nibble 1-8, variant nibble
// 8/9/a/b) — plain "1111...1111" placeholders no longer pass.
const TASK_ID = "11111111-1111-4111-8111-111111111111";
const LIST_ID = "22222222-2222-4222-8222-222222222222";

/** Deterministic, RFC-4122-valid UUID for test fixtures. */
function fakeUuid(i: number): string {
  const hex = i.toString(16).padStart(8, "0");
  return `${hex}-1111-4111-8111-111111111111`;
}

describe("SyncPushTaskSchema (G017)", () => {
  it("accepts the full field set task.create supports", () => {
    const parsed = SyncPushTaskSchema.parse({
      id: TASK_ID,
      operation: "create",
      data: {
        ...baseData,
        title: "Title",
        priority: "high",
        listId: LIST_ID,
        orderIndex: 3,
        reminderAt: new Date(),
        recurrenceRule: "weekly",
        recurrenceInterval: 2,
        recurrenceEndDate: new Date(),
      },
    });

    expect(parsed.data.priority).toBe("high");
    expect(parsed.data.listId).toBe(LIST_ID);
    expect(parsed.data.orderIndex).toBe(3);
    expect(parsed.data.recurrenceRule).toBe("weekly");
    expect(parsed.data.recurrenceInterval).toBe(2);
  });

  it("rejects an invalid priority value", () => {
    const result = SyncPushTaskSchema.safeParse({
      id: TASK_ID,
      operation: "create",
      data: { ...baseData, priority: "urgent" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a recurrenceInterval outside 1-365", () => {
    const result = SyncPushTaskSchema.safeParse({
      id: TASK_ID,
      operation: "create",
      data: { ...baseData, recurrenceInterval: 400 },
    });
    expect(result.success).toBe(false);
  });

  it("still accepts a wire-format task with none of the new fields set", () => {
    const result = SyncPushTaskSchema.safeParse({
      id: TASK_ID,
      operation: "update",
      data: { ...baseData, title: "Just a title" },
    });
    expect(result.success).toBe(true);
  });
});

describe("SyncPushInputSchema (G014)", () => {
  const makeTask = (i: number) => ({
    id: fakeUuid(i),
    operation: "create" as const,
    data: { ...baseData },
  });

  it("accepts a batch at the 500-task cap", () => {
    const tasks = Array.from({ length: 500 }, (_, i) => makeTask(i));
    const result = SyncPushInputSchema.safeParse({ tasks });
    expect(result.success).toBe(true);
  });

  it("rejects a batch beyond the 500-task cap", () => {
    const tasks = Array.from({ length: 501 }, (_, i) => makeTask(i));
    const result = SyncPushInputSchema.safeParse({ tasks });
    expect(result.success).toBe(false);
  });
});

describe("SyncPullInputSchema (G004)", () => {
  it("accepts a pull with no cursorId (first page)", () => {
    const result = SyncPullInputSchema.safeParse({
      lastSyncTimestamp: 0,
      entityTypes: ["task"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a pull with a cursorId for keyset pagination", () => {
    const result = SyncPullInputSchema.safeParse({
      lastSyncTimestamp: 1234,
      cursorId: TASK_ID,
      entityTypes: ["task"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed cursorId", () => {
    const result = SyncPullInputSchema.safeParse({
      lastSyncTimestamp: 0,
      cursorId: "not-a-uuid",
      entityTypes: ["task"],
    });
    expect(result.success).toBe(false);
  });
});
