/**
 * Smart Obsidian Sync — Routes Tokilist tasks into organized vault folders.
 *
 * Usage:
 *   npx tsx scripts/sync-tasks-to-obsidian.ts
 *   npx tsx scripts/sync-tasks-to-obsidian.ts --dry-run
 *   npx tsx scripts/sync-tasks-to-obsidian.ts --clean
 *
 * Env vars:
 *   TOKILIST_API_URL  (default: http://localhost:3000)
 *   OBSIDIAN_SYNC_API_KEY
 *   TOKILIST_USER_ID
 *   VAULT_PATH        (default: /home/m/Documents/Vault/Tokidian)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, renameSync } from "fs";
import { join, resolve, dirname } from "path";

// Simple .env loader (no external deps)
function loadEnv(filePath: string): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(resolve("/home/m/coding/todo-list", ".env"));

const API_URL = process.env.TOKILIST_API_URL;
const API_KEY = process.env.OBSIDIAN_SYNC_API_KEY;
const USER_ID = process.env.TOKILIST_USER_ID;
const VAULT_PATH = process.env.VAULT_PATH ?? "/home/m/Documents/Vault/Tokidian";
const FALLBACK_PORTS = [3000, 3001, 3002];

const DRY_RUN = process.argv.includes("--dry-run");
const CLEAN = process.argv.includes("--clean");

// ─── Types ───────────────────────────────────────────────────────────

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  category: {
    id: string;
    name: string;
    path: string[]; // resolved ancestor names
  } | null;
  subtasks: Subtask[];
}

type TaskType = "bug" | "feature";

// ─── Classification ──────────────────────────────────────────────────

const BUG_KEYWORDS = [
  "bug", "fix", "broken", "error", "crash", "issue", "wrong",
  "doesn't work", "not working", "failing", "regression", "typo",
  "missing", "undefined", "null", "nan", "404", "500",
];

const FEATURE_KEYWORDS = [
  "add", "implement", "create", "build", "new", "feature", "enhance",
  "improve", "support", "integrate", "redesign", "refactor", "update",
  "upgrade", "migrate",
];

function classifyTask(title: string): TaskType {
  const lower = title.toLowerCase();
  const bugScore = BUG_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const featureScore = FEATURE_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (bugScore > featureScore) return "bug";
  return "feature";
}

// ─── Helpers ─────────────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.replace(/[/\\:*?"<>|#^[\]]/g, "-").trim().slice(0, 100);
}

function ensureDir(dirPath: string): void {
  if (DRY_RUN) return;
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): void {
  if (DRY_RUN) {
    console.log(`  [dry-run] Would write: ${filePath}`);
    return;
  }
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf-8");
}

function getRootCategory(task: Task): string | null {
  if (!task.category) return null;
  return task.category.path.length > 0 ? task.category.path[0]! : task.category.name;
}

function getSubCategory(task: Task): string | null {
  if (!task.category) return null;
  if (task.category.path.length > 1) return task.category.path[1]!;
  if (task.category.path.length === 1 && task.category.name !== task.category.path[0]) {
    return task.category.name;
  }
  return null;
}

// ─── File Templates ──────────────────────────────────────────────────

function codingTaskFile(opts: {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  type: TaskType;
  project: string;
  createdAt: string;
}): string {
  const status = opts.completed ? "done" : "todo";
  const created = new Date(opts.createdAt).toISOString().split("T")[0];
  const desc = opts.description ?? "";

  return `---
task_id: "${opts.id}"
status: "${status}"
type: "${opts.type}"
project: "${opts.project}"
created: "${created}"
synced_at: "${new Date().toISOString()}"
---

# ${opts.title}

${desc}
`.trimEnd() + "\n";
}

function fashionTaskFile(opts: {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  category: string;
  createdAt: string;
  subtasks: Subtask[];
}): string {
  const status = opts.completed ? "done" : "todo";
  const created = new Date(opts.createdAt).toISOString().split("T")[0];
  const desc = opts.description ?? "";

  let subtaskSection = "";
  if (opts.subtasks.length > 0) {
    const lines = opts.subtasks
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`);
    subtaskSection = `\n## Tasks\n${lines.join("\n")}\n`;
  }

  return `---
task_id: "${opts.id}"
status: "${status}"
category: "${opts.category}"
created: "${created}"
synced_at: "${new Date().toISOString()}"
---

# ${opts.title}

${desc}
${subtaskSection}`.trimEnd() + "\n";
}

function newCommissionFile(clientName: string, subtasks: Subtask[]): string {
  const taskLines = subtasks.length > 0
    ? subtasks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`)
        .join("\n")
    : "- ";

  return `# Commission: ${clientName}

**Status:** #commission #active
**Client:** ${clientName}
**Start Date:**
**Deadline:**
**Completion Date:**

---

## 📋 Project Details

### Garment Type
-

### Requirements
-

### Tasks
${taskLines}

### Measurements
-

### Special Requests
-

---

## 💰 Pricing

| Item | Cost |
|------|------|
| Materials | $ |
| Labor (__ hrs @ $__/hr) | $ |
| **Total** | **$** |

**Deposit received:** $
**Final payment:** $

---

## 🎨 Design

### Inspiration
-

### Pattern
-

### Fabrics & Materials
-

---

## 📝 Progress Log

### [Date]
-

---

## 📸 Photos

-

---

## ✅ Checklist

Following [[Commission Workflow]]:

- [ ] Inquiry received
- [ ] Quote sent and approved
- [ ] Contract signed
- [ ] Deposit received
- [ ] Design approved
- [ ] Materials ordered
- [ ] Materials received
- [ ] Pattern drafted/selected
- [ ] Mockup made (if needed)
- [ ] Fabric cut
- [ ] Construction in progress
- [ ] First fitting
- [ ] Adjustments made
- [ ] Final fitting
- [ ] Finishing complete
- [ ] Photos taken
- [ ] Final payment received
- [ ] Delivered

---

## 🗒️ Notes

-

---

[[Fashion|← Back to Fashion]]
`;
}

// ─── Commission Update ───────────────────────────────────────────────

function updateCommissionTasks(filePath: string, subtasks: Subtask[]): void {
  const content = readFileSync(filePath, "utf-8");

  const taskLines = subtasks
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`)
    .join("\n");

  // Replace the ### Tasks section content (up to the next ### or ---)
  const tasksRegex = /(### Tasks\n)([\s\S]*?)(\n###|\n---)/;
  const match = content.match(tasksRegex);

  if (match) {
    const updated = content.replace(tasksRegex, `$1${taskLines}\n$3`);
    writeFile(filePath, updated);
  } else {
    // If no Tasks section exists, insert before the first ---  after ## 📋 Project Details
    const detailsIdx = content.indexOf("## 📋 Project Details");
    if (detailsIdx !== -1) {
      const nextSeparator = content.indexOf("---", detailsIdx);
      if (nextSeparator !== -1) {
        const before = content.slice(0, nextSeparator);
        const after = content.slice(nextSeparator);
        const updated = `${before}### Tasks\n${taskLines}\n\n${after}`;
        writeFile(filePath, updated);
      }
    }
  }
}

// ─── Commission File Finder ──────────────────────────────────────────

function findCommissionFile(commissionName: string): string | null {
  const commissionsDir = join(VAULT_PATH, "Fashion", "Commissions");
  if (!existsSync(commissionsDir)) return null;

  const sanitized = sanitize(commissionName);

  // Check in per-project subfolder first
  const subfolderPath = join(commissionsDir, sanitized);
  if (existsSync(subfolderPath) && statSync(subfolderPath).isDirectory()) {
    const files = readdirSync(subfolderPath).filter((f) => f.endsWith(".md"));
    if (files.length > 0) return join(subfolderPath, files[0]!);
  }

  // Check for file directly in Commissions/
  const directFile = join(commissionsDir, `${sanitized}.md`);
  if (existsSync(directFile)) return directFile;

  // Fuzzy match: search for files containing the name
  const entries = readdirSync(commissionsDir);
  for (const entry of entries) {
    const entryPath = join(commissionsDir, entry);
    if (entry.toLowerCase().includes(commissionName.toLowerCase())) {
      if (statSync(entryPath).isFile() && entry.endsWith(".md")) return entryPath;
      if (statSync(entryPath).isDirectory()) {
        const files = readdirSync(entryPath).filter((f) => f.endsWith(".md"));
        if (files.length > 0) return join(entryPath, files[0]!);
      }
    }
  }

  return null;
}

// ─── Vault Operations ────────────────────────────────────────────────

function cleanTasksFolder(): void {
  const tasksDir = join(VAULT_PATH, "Tasks");
  if (!existsSync(tasksDir)) return;

  console.log("Cleaning Tasks/ folder...");
  if (DRY_RUN) {
    console.log("  [dry-run] Would delete contents of Tasks/");
    return;
  }
  rmSync(tasksDir, { recursive: true, force: true });
  mkdirSync(tasksDir, { recursive: true });
  console.log("  Tasks/ folder cleaned.");
}

function restructureCommissions(): void {
  const commissionsDir = join(VAULT_PATH, "Fashion", "Commissions");
  if (!existsSync(commissionsDir)) return;

  console.log("Restructuring Fashion/Commissions/ into per-project folders...");

  const files = readdirSync(commissionsDir);
  for (const file of files) {
    const filePath = join(commissionsDir, file);
    if (!statSync(filePath).isFile() || !file.endsWith(".md")) continue;
    if (file === "Commission Workflow.md") continue;

    const folderName = file.replace(".md", "");
    const folderPath = join(commissionsDir, folderName);

    if (DRY_RUN) {
      console.log(`  [dry-run] Would move ${file} → ${folderName}/${file}`);
      continue;
    }

    ensureDir(folderPath);
    renameSync(filePath, join(folderPath, file));
    console.log(`  Moved ${file} → ${folderName}/${file}`);
  }
}

// ─── Routing Logic ───────────────────────────────────────────────────

function routeCodingTask(task: Task): void {
  const subCat = getSubCategory(task);

  // Coding with no sub-category → Ideas/
  if (!subCat) {
    const filePath = join(VAULT_PATH, "Coding", "Ideas", `${sanitize(task.title)}.md`);
    console.log(`  → ${filePath.replace(VAULT_PATH + "/", "")}`);
    writeFile(filePath, codingTaskFile({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      type: "feature",
      project: "General",
      createdAt: task.createdAt,
    }));
    return;
  }

  const project = subCat;

  // If the task has subtasks, it's a container — expand each subtask as its own file
  if (task.subtasks.length > 0) {
    for (const subtask of task.subtasks) {
      const type = classifyTask(subtask.title);
      const folder = type === "bug" ? "Bugs" : "Features";
      const filePath = join(VAULT_PATH, "Coding", "Projects", project, folder, `${sanitize(subtask.title)}.md`);
      console.log(`  → ${filePath.replace(VAULT_PATH + "/", "")}`);
      writeFile(filePath, codingTaskFile({
        id: subtask.id,
        title: subtask.title,
        description: null,
        completed: subtask.completed,
        type,
        project,
        createdAt: task.createdAt,
      }));
    }
    return;
  }

  // Single task without subtasks
  const type = classifyTask(task.title);
  const folder = type === "bug" ? "Bugs" : "Features";
  const filePath = join(VAULT_PATH, "Coding", "Projects", project, folder, `${sanitize(task.title)}.md`);
  console.log(`  → ${filePath.replace(VAULT_PATH + "/", "")}`);
  writeFile(filePath, codingTaskFile({
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    type,
    project,
    createdAt: task.createdAt,
  }));
}

function routeSewingTask(task: Task): void {
  const subCat = getSubCategory(task);

  if (subCat === "Commissions") {
    // Commission tasks → update or create commission file
    const commissionName = task.title;
    const existingFile = findCommissionFile(commissionName);

    if (existingFile) {
      console.log(`  → Updating commission: ${existingFile.replace(VAULT_PATH + "/", "")}`);
      updateCommissionTasks(existingFile, task.subtasks);
    } else {
      // Create new commission in per-project folder
      const folderPath = join(VAULT_PATH, "Fashion", "Commissions", sanitize(commissionName));
      const filePath = join(folderPath, `${sanitize(commissionName)}.md`);
      console.log(`  → New commission: ${filePath.replace(VAULT_PATH + "/", "")}`);
      writeFile(filePath, newCommissionFile(commissionName, task.subtasks));
    }
    return;
  }

  if (subCat === "Alterations" || subCat === "Design") {
    const folder = subCat;
    if (task.subtasks.length > 0) {
      // Each subtask gets its own file in a task-named folder
      for (const subtask of task.subtasks) {
        const filePath = join(VAULT_PATH, "Fashion", folder, sanitize(task.title), `${sanitize(subtask.title)}.md`);
        console.log(`  → ${filePath.replace(VAULT_PATH + "/", "")}`);
        writeFile(filePath, fashionTaskFile({
          id: subtask.id,
          title: subtask.title,
          description: null,
          completed: subtask.completed,
          category: folder,
          createdAt: task.createdAt,
          subtasks: [],
        }));
      }
    } else {
      const filePath = join(VAULT_PATH, "Fashion", folder, `${sanitize(task.title)}.md`);
      console.log(`  → ${filePath.replace(VAULT_PATH + "/", "")}`);
      writeFile(filePath, fashionTaskFile({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed,
        category: folder,
        createdAt: task.createdAt,
        subtasks: [],
      }));
    }
    return;
  }

  // Fallback: Sewing with unknown sub-category
  const filePath = join(VAULT_PATH, "Fashion", sanitize(subCat ?? "General"), `${sanitize(task.title)}.md`);
  console.log(`  → ${filePath.replace(VAULT_PATH + "/", "")}`);
  writeFile(filePath, fashionTaskFile({
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    category: subCat ?? "Sewing",
    createdAt: task.createdAt,
    subtasks: task.subtasks,
  }));
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) { console.error("OBSIDIAN_SYNC_API_KEY is required (checked .env at ~/coding/todo-list/.env)"); process.exit(1); }
  if (!USER_ID) { console.error("TOKILIST_USER_ID is required (checked .env at ~/coding/todo-list/.env)"); process.exit(1); }
  console.log(`API_KEY: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`);
  console.log(`USER_ID: ${USER_ID}`);

  if (DRY_RUN) console.log("🏃 DRY RUN — no files will be modified\n");

  // Fetch tasks — discover port if not explicitly set
  let res: Response | undefined;
  let apiBase: string;

  if (API_URL) {
    apiBase = API_URL;
    res = await fetch(`${apiBase}/api/tasks?user_id=${USER_ID}`, {
      headers: { "x-api-key": API_KEY },
    }).catch(() => undefined);
  } else {
    apiBase = "";
    for (const port of FALLBACK_PORTS) {
      const url = `http://localhost:${port}`;
      try {
        const attempt = await fetch(`${url}/api/tasks?user_id=${USER_ID}`, {
          headers: { "x-api-key": API_KEY },
          signal: AbortSignal.timeout(3000),
        });
        if (attempt.ok) {
          res = attempt;
          apiBase = url;
          console.log(`Found dev server on port ${port}`);
          break;
        } else {
          console.log(`Port ${port} responded with ${attempt.status} (${attempt.statusText})`);
        }
      } catch {
        // port not responding, try next
      }
    }
  }

  if (!res || !res.ok) {
    const tried = API_URL ?? FALLBACK_PORTS.map((p) => `localhost:${p}`).join(", ");
    console.error(`Could not reach API (tried: ${tried})`);
    process.exit(1);
  }

  const tasks: Task[] = await res.json();
  console.log(`Fetched ${tasks.length} tasks from ${apiBase}\n`);

  // Filter to Coding and Sewing only
  const relevantTasks = tasks.filter((t) => {
    const root = getRootCategory(t);
    return root === "Coding" || root === "Sewing";
  });

  console.log(`${relevantTasks.length} tasks in Coding/Sewing categories\n`);

  // Step: Restructure commissions into per-project folders
  restructureCommissions();
  console.log("");

  // Step: Clean Tasks/ folder if requested
  if (CLEAN) {
    cleanTasksFolder();
    console.log("");
  }

  // Route each task
  let codingCount = 0;
  let sewingCount = 0;

  for (const task of relevantTasks) {
    const root = getRootCategory(task);
    console.log(`[${root}] ${task.title} (${task.subtasks.length} subtasks)`);

    if (root === "Coding") {
      routeCodingTask(task);
      codingCount++;
    } else if (root === "Sewing") {
      routeSewingTask(task);
      sewingCount++;
    }
  }

  console.log(`\nSync complete: ${codingCount} coding tasks, ${sewingCount} sewing/fashion tasks`);
  if (DRY_RUN) console.log("(dry run — no changes made)");
}

main().catch(console.error);
