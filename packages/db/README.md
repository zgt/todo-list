# @acme/db

Drizzle ORM schema and client for the Tokilist database (PostgreSQL via Supabase).

## Schema changes: `db:push` only

This package has **no migrations folder**. The only supported way to apply
schema changes is `drizzle-kit push`, run from the repo root:

```bash
pnpm db:push
```

or directly from this package:

```bash
cd packages/db
pnpm push
```

`push` diffs `src/schema.ts` against the live database and applies the
difference directly — it does not read or write a `drizzle/` migrations
directory, so none exists here.

**Do not run `drizzle-kit generate` or `drizzle-kit migrate` against this
project.** A previously-committed `drizzle/` folder had gone stale (it
stopped at an early snapshot and no longer matched `src/schema.ts`), and a
migration-based provision from it would produce the wrong schema. It was
removed rather than regenerated to avoid that trap coming back — if you add
migrations back in the future, make sure they're regenerated and applied on
every schema change, or don't add them at all.

## Other commands

```bash
pnpm studio      # Drizzle Studio
pnpm typecheck
pnpm build
```
