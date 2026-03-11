# Tokilist

A cross-platform task management app built as a Turborepo monorepo with shared backend, web (Next.js), and mobile (Expo/React Native) clients.

## What's Inside

### Apps

- **[Next.js Web App](./apps/nextjs)** — Next.js 16, React 19, Tailwind CSS v4, shadcn/ui
- **[Expo Mobile App](./apps/expo)** — Expo SDK 55, React Native 0.83, NativeWind v5, iOS home screen widgets (SwiftUI)

### Packages

- **[@acme/api](./packages/api)** — tRPC v11 API layer shared across all apps
- **[@acme/auth](./packages/auth)** — Authentication via Better Auth (Discord OAuth, Apple Sign In, session management, auth proxy)
- **[@acme/db](./packages/db)** — Drizzle ORM with PostgreSQL (Supabase)
- **[@acme/ui](./packages/ui)** — Shared UI components (shadcn/ui)

## Features

### Task Management
- Create, organize, and track tasks with hierarchical categories, priorities, and due dates
- Subtasks with auto-completion logic (complete parent when all subtasks done)
- Recurring tasks (daily, weekly, monthly, yearly, custom interval)
- Task snoozing with configurable durations
- Reminders with configurable offset and cron-based delivery
- Offline-first mobile with local SQLite, bidirectional sync, and conflict resolution
- Native iOS home screen widgets (small/medium/large) with real-time task display
- Automatic archiving of completed tasks via Supabase Edge Functions
- Multiple views: stack (swipeable cards), list, and calendar (mobile)

### Shared Lists
- Create collaborative task lists with invite codes
- Role-based access control (owner/editor/viewer)
- Configurable invites with expiration and usage limits
- Push notifications for shared list activity

### Content Moderation
- Report content (spam, offensive, harassment)
- Block/unblock users
- Auto-flagging based on keyword matching

### Push Notifications
- Expo Push Notification Service integration
- Per-user preferences (push/email toggles, reminder offset)
- Shared list activity notifications
- Scheduled reminders via server-side cron job

### Obsidian Sync
Sync tasks to an Obsidian vault as markdown files.

- **Script:** `scripts/sync-tasks-to-obsidian.ts`
- **Usage:** `npx tsx scripts/sync-tasks-to-obsidian.ts`
- Requires Obsidian Local REST API plugin and env vars (`OBSIDIAN_SYNC_API_KEY`, `TOKILIST_USER_ID`, `OBSIDIAN_REST_API_KEY`)

## Getting Started

```bash
# Install dependencies
pnpm i

# Copy environment variables
cp .env.example .env

# Generate Better Auth schema
pnpm auth:generate

# Push database schema
pnpm db:push

# Run all apps in dev mode
pnpm dev

# Run only the Next.js app
pnpm dev:next

# Database studio
pnpm db:studio
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Monorepo | Turborepo |
| Web | Next.js 16, React 19, Tailwind CSS v4 |
| Mobile | Expo SDK 55, React Native 0.83, NativeWind v5 |
| API | tRPC v11 |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Auth | Better Auth (Discord OAuth, Apple Sign In) |
| UI | shadcn/ui, Framer Motion |
| Widgets | SwiftUI (iOS) |
| Notifications | Expo Push Notifications |
| Error Tracking | Sentry (mobile) |

## Deployment

### Web (Vercel)
1. Create a new Vercel project pointing to `apps/nextjs`
2. Add your `POSTGRES_URL` and other env vars
3. Deploy — Vercel handles Turborepo builds automatically

### Mobile (EAS)
```bash
# Install EAS CLI
pnpm add -g eas-cli

# Build for iOS
cd apps/expo
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# OTA updates (minor fixes, no native changes)
eas update --auto
```

## Project Structure

```
apps/
  ├── expo/          # React Native mobile app
  ├── nextjs/        # Next.js web app
packages/
  ├── api/           # Shared tRPC router
  ├── auth/          # Better Auth config
  ├── db/            # Drizzle schema + client
  └── ui/            # Shared UI components
scripts/             # Obsidian sync utilities
supabase/            # Edge functions (task archiving)
tooling/             # Shared ESLint, Prettier, Tailwind, TypeScript configs
```

## License

MIT
