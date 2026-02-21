import { TRPCError } from "@trpc/server";

import type { db } from "@acme/db/client";
import { and, eq } from "@acme/db";
import { TaskList, TaskListMember } from "@acme/db/schema";

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export async function assertListAccess(
  database: typeof db,
  userId: string,
  listId: string,
  minRole: "viewer" | "editor" | "owner",
): Promise<{ role: string }> {
  // Check if user is the list owner
  const list = await database.query.TaskList.findFirst({
    where: and(eq(TaskList.id, listId)),
    columns: { ownerId: true },
  });

  if (!list) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found",
    });
  }

  if (list.ownerId === userId) {
    return { role: "owner" };
  }

  // Check membership
  const member = await database.query.TaskListMember.findFirst({
    where: and(
      eq(TaskListMember.listId, listId),
      eq(TaskListMember.userId, userId),
    ),
    columns: { role: true },
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient list access",
    });
  }

  const userLevel = ROLE_HIERARCHY[member.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient list access",
    });
  }

  return { role: member.role };
}
