/**
 * Sync tasks from Tokilist API to Obsidian via Local REST API.
 *
 * Usage:
 *   npx tsx /home/m/coding/todo-list/scripts/sync-tasks-to-obsidian.ts
 *
 * Or with inline env vars:
 *   OBSIDIAN_SYNC_API_KEY=xxx OBSIDIAN_REST_API_KEY=xxx npx tsx sync-tasks-to-obsidian.ts
 *
 * Loads .env from the todo-list project root if present, then from cwd.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env from the todo-list project root first, then cwd as fallback
config({ path: resolve("/home/m/coding/todo-list", ".env") });
config(); // also load from cwd if present (won't override existing)

const API_URL = process.env.TOKILIST_API_URL ?? "http://localhost:3000";
const API_KEY = process.env.OBSIDIAN_SYNC_API_KEY;
const USER_ID = process.env.TOKILIST_USER_ID;
const OBS_URL = process.env.OBSIDIAN_REST_URL ?? "https://127.0.0.1:27124";
const OBS_KEY = process.env.OBSIDIAN_REST_API_KEY;

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  category: { name: string; color: string } | null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|#^[\]]/g, "-").slice(0, 100);
}

function buildNoteContent(task: Task): string {
  const status = task.completed ? "done" : "todo";
  const categoryName = task.category?.name ?? "Uncategorized";
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";

  return `---
task_id: "${task.id}"
status: "${status}"
category: "${categoryName}"
due_date: "${dueDate}"
synced_at: "${new Date().toISOString()}"
---
# ${task.title}

**Status:** #task/${status}
**Category:** ${categoryName}
**Due Date:** ${dueDate || "None"}

---

## Description

${task.description || "No description."}

---

## Checklist

- [${task.completed ? "x" : " "}] Mark as complete
`;
}

async function obsidianPut(path: string, content: string): Promise<boolean> {
  const res = await fetch(`${OBS_URL}/vault/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${OBS_KEY}`,
      "Content-Type": "text/markdown",
    },
    body: content,
  });
  return res.ok;
}

async function obsidianSearch(
  query: string,
): Promise<{ filename: string }[] | null> {
  const res = await fetch(`${OBS_URL}/search/simple/?query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${OBS_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  if (!API_KEY) {
    console.error("OBSIDIAN_SYNC_API_KEY is required");
    process.exit(1);
  }
  if (!OBS_KEY) {
    console.error("OBSIDIAN_REST_API_KEY is required");
    process.exit(1);
  }
  if (!USER_ID) {
    console.error("TOKILIST_USER_ID is required");
    process.exit(1);
  }

  // Fetch tasks from API
  const res = await fetch(`${API_URL}/api/tasks?user_id=${USER_ID}`, {
    headers: { "x-api-key": API_KEY },
  });

  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const tasks: Task[] = await res.json();
  console.log(`Fetched ${tasks.length} tasks`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const task of tasks) {
    const filename = sanitizeFilename(task.title);
    const path = `Tasks/${filename}.md`;
    const content = buildNoteContent(task);

    // Check if note with this task_id already exists
    const existing = await obsidianSearch(`task_id: "${task.id}"`);

    if (existing && existing.length > 0) {
      // Update existing note
      const existingPath = existing[0]!.filename;
      const ok = await obsidianPut(existingPath, content);
      if (ok) {
        updated++;
        console.log(`Updated: ${existingPath}`);
      } else {
        console.error(`Failed to update: ${existingPath}`);
      }
    } else {
      // Create new note
      const ok = await obsidianPut(path, content);
      if (ok) {
        created++;
        console.log(`Created: ${path}`);
      } else {
        console.error(`Failed to create: ${path}`);
      }
    }
  }

  console.log(
    `\nSync complete: ${created} created, ${updated} updated, ${skipped} skipped`,
  );
}

main().catch(console.error);
