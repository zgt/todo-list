import { eq } from "@acme/db";
import { db } from "@acme/db/client";
import { TaskList, TaskListMember, user } from "@acme/db/schema";

import { sendPushToUsers } from "../push";

/**
 * Get list member user IDs excluding the actor, filtered by sharedListActivity preference.
 * Includes both TaskListMember entries and the list owner.
 */
async function getOtherMemberIdsWithPref(
  listId: string,
  excludeUserId: string,
): Promise<string[]> {
  const list = await db.query.TaskList.findFirst({
    where: eq(TaskList.id, listId),
    columns: { ownerId: true },
  });
  if (!list) return [];

  const members = await db.query.TaskListMember.findMany({
    where: eq(TaskListMember.listId, listId),
    with: { user: true },
  });

  const eligibleIds: string[] = [];
  const seenIds = new Set<string>();

  for (const member of members) {
    seenIds.add(member.userId);
    if (member.userId === excludeUserId) continue;
    const prefs = member.user.notificationPreferences as Record<
      string,
      boolean
    > | null;
    if (prefs?.sharedListActivity !== false) {
      eligibleIds.push(member.userId);
    }
  }

  // Owner may not be in TaskListMember — check separately
  if (list.ownerId !== excludeUserId && !seenIds.has(list.ownerId)) {
    const owner = await db.query.user.findFirst({
      where: eq(user.id, list.ownerId),
    });
    if (owner) {
      const prefs = owner.notificationPreferences as Record<
        string,
        boolean
      > | null;
      if (prefs?.sharedListActivity !== false) {
        eligibleIds.push(list.ownerId);
      }
    }
  }

  return eligibleIds;
}

/** Push: A task on a shared list was completed */
export async function pushNotifyTaskCompleted(params: {
  listId: string;
  actorUserId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
}): Promise<void> {
  const userIds = await getOtherMemberIdsWithPref(
    params.listId,
    params.actorUserId,
  );
  if (userIds.length === 0) return;

  const list = await db.query.TaskList.findFirst({
    where: eq(TaskList.id, params.listId),
    columns: { name: true },
  });

  await sendPushToUsers(userIds, {
    title: `✅ Task Completed`,
    body: `${params.actorName} completed "${params.taskTitle}" in ${list?.name ?? "shared list"}`,
    data: {
      type: "shared-list",
      listId: params.listId,
      taskId: params.taskId,
    },
  });
}

/** Push: A subtask on a shared list was completed */
export async function pushNotifySubtaskCompleted(params: {
  listId: string;
  actorUserId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
  subtaskTitle: string;
}): Promise<void> {
  const userIds = await getOtherMemberIdsWithPref(
    params.listId,
    params.actorUserId,
  );
  if (userIds.length === 0) return;

  await sendPushToUsers(userIds, {
    title: `✅ Subtask Completed`,
    body: `${params.actorName} completed "${params.subtaskTitle}" on "${params.taskTitle}"`,
    data: {
      type: "shared-list",
      listId: params.listId,
      taskId: params.taskId,
    },
  });
}

/** Push: A task on a shared list was edited */
export async function pushNotifyTaskEdited(params: {
  listId: string;
  actorUserId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
}): Promise<void> {
  const userIds = await getOtherMemberIdsWithPref(
    params.listId,
    params.actorUserId,
  );
  if (userIds.length === 0) return;

  const list = await db.query.TaskList.findFirst({
    where: eq(TaskList.id, params.listId),
    columns: { name: true },
  });

  await sendPushToUsers(userIds, {
    title: `📝 Task Updated`,
    body: `${params.actorName} edited "${params.taskTitle}" in ${list?.name ?? "shared list"}`,
    data: {
      type: "shared-list",
      listId: params.listId,
      taskId: params.taskId,
    },
  });
}
