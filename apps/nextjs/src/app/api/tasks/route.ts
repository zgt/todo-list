import { NextResponse } from "next/server";

import { and, desc, eq, inArray, isNull } from "@acme/db";
import { db } from "@acme/db/client";
import { Category, Task } from "@acme/db/schema";

import { env } from "~/env";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = env.OBSIDIAN_SYNC_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json(
      { error: "user_id query param required" },
      { status: 400 },
    );
  }

  const tasks = await db.query.Task.findMany({
    where: and(
      eq(Task.userId, userId),
      isNull(Task.deletedAt),
      isNull(Task.archivedAt),
    ),
    orderBy: [desc(Task.createdAt)],
    with: { category: true },
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
