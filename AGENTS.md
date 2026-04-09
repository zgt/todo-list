# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turborepo monorepo. App entry points live in `apps/nextjs` (web) and `apps/expo` (mobile). Shared logic lives in `packages/api`, `packages/auth`, `packages/db`, `packages/ui`, and `packages/validators`. Cross-cutting config is under `tooling/`, migrations live in `packages/db/drizzle` and `apps/expo/drizzle`, and Supabase edge functions live in `supabase/functions`. Treat `apps/expo/ios/` as generated output from Expo prebuild; do not edit it directly.

## Build, Test, and Development Commands
Run commands from the repo root unless a package-specific script is needed.

- `pnpm dev`: start the Turborepo watcher for active workspaces.
- `pnpm dev:next`: run only the Next.js app.
- `pnpm build`: build all workspaces through Turbo.
- `pnpm lint`: run ESLint across the repo.
- `pnpm format:fix`: apply Prettier formatting.
- `pnpm typecheck`: run TypeScript checks for all workspaces.
- `pnpm auth:generate`: regenerate Better Auth artifacts.
- `pnpm db:push` or `pnpm db:studio`: update or inspect the database schema.

## Coding Style & Naming Conventions
Use TypeScript with ES modules, 2-space indentation, semicolons, and double quotes. Prettier and shared ESLint configs are the source of truth; do not hand-format imports because `@ianvs/prettier-plugin-sort-imports` handles ordering. Use `PascalCase` for React components, `camelCase` for functions and hooks, and kebab-case route folders such as `apps/nextjs/src/app/settings`. Prefer `@acme/*` imports across packages. Database tables and columns stay `snake_case`; application code stays `camelCase`.

## Testing Guidelines
There is no established automated test suite in the repository yet. For now, treat `pnpm lint` and `pnpm typecheck` as the minimum verification gate for every change, and run the relevant app locally when touching UI, auth, sync, or database flows. When adding tests, place them beside the code they cover and use `*.test.ts` or `*.test.tsx`.

## Workflow Notes
Run `pnpm auth:generate` before first boot and whenever auth schema/config changes, then follow with `pnpm db:push`. For web UI primitives, use `pnpm ui-add` instead of hand-rolling components in `packages/ui/src`. When changing visual styling, consult `DESIGN_SYSTEM.md` and preserve the established emerald palette, spacing scale, and component patterns.

## Commit & Pull Request Guidelines
Recent history favors short, imperative commit subjects such as `added google oauth` or `refresh cookie cache and make age longer`. Keep commits focused and descriptive; prefer one logical change per commit. Pull requests should include a concise summary, affected apps/packages, linked issues, and screenshots or screen recordings for visible UI changes. Call out schema, auth, or environment-variable changes explicitly.
