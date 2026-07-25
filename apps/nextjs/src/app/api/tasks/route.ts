import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { and, desc, eq, inArray, isNull } from "@acme/db";
import { db } from "@acme/db/client";
import { Category, Task } from "@acme/db/schema";

import { env } from "~/env";

/** Constant-time string comparison to avoid leaking the API key via timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = env.OBSIDIAN_SYNC_API_KEY;

  if (!expectedKey || !apiKey || !safeEqual(apiKey, expectedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The key authenticates a single, server-configured user — never trust
  // a client-supplied user_id, or a leaked key could read anyone's tasks.
  const userId = env.OBSIDIAN_SYNC_USER_ID;
  if (!userId) {
    return NextResponse.json(
      { error: "Obsidian sync is not configured for a user" },
      { status: 403 },
    );
  }

  const requestedUserId = new URL(request.url).searchParams.get("user_id");
  if (requestedUserId && requestedUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await db.query.Task.findMany({
    where: and(
      eq(Task.userId, userId),
      isNull(Task.deletedAt),
      isNull(Task.archivedAt),
    ),
    orderBy: [desc(Task.createdAt)],
    with: { category: true, subtasks: true },
  });

  // Collect all unique category IDs and ancestor IDs needed
  const neededCategoryIds = new Set<string>();
  tasks.forEach((task) => {
    if (task.category) {
      neededCategoryIds.add(task.category.id);
      task.category.path.forEach((id) => neededCategoryIds.add(id));
    }
  });

  let categoryNameMap = new Map<string, string>();
  if (neededCategoryIds.size > 0) {
    const categories = await db.query.Category.findMany({
      where: inArray(Category.id, Array.from(neededCategoryIds)),
      columns: { id: true, name: true },
    });
    categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  }

  const transformedTasks = tasks.map((task) => {
    if (!task.category) return task;
    return {
      ...task,
      category: {
        ...task.category,
        path: [...new Set(task.category.path)].map(
          (id) => categoryNameMap.get(id) ?? id,
        ),
      },
    };
  });

  return NextResponse.json(transformedTasks);
}
