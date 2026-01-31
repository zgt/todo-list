import { NextResponse } from "next/server";

import { and, desc, eq, isNull } from "@acme/db";
import { db } from "@acme/db/client";
import { Task } from "@acme/db/schema";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.OBSIDIAN_SYNC_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id query param required" }, { status: 400 });
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

  return NextResponse.json(tasks);
}
