# CJs

A modular business platform — quoting, invoicing, inventory, jobs — built on SvelteKit with
Svelte 5 runes, drizzle-orm on Postgres (Neon, RLS tenancy in one database), Tailwind v4 and
shadcn-svelte. Package manager is [bun](https://bun.sh).

## Developing

```sh
bun install
bun run dev          # start the dev server
```

## Testing

```sh
bun run check        # svelte-check, must be clean
bun run lint         # prettier + eslint (bun run format fixes prettier)
bun run test         # the unit project — needs a configured .env.test (cjs_app role)
bun run test:stories # every Storybook story, light and dark, axe at error severity
bun run test:mobile  # the *.mobile.spec.ts suites: 44px floors and 390px layout facts
```

## Accessibility gate

Every `*.stories.svelte` file is executed by `bun run test:stories` in BOTH themes with axe
at error severity — a story with any violation fails the suite. The mechanism and its
recorded limits live in `.storybook/preview.ts` (`a11y.test: 'error'`); the full WHY prose
stays there rather than here.

New components must ship Storybook stories (client decision Q14, 29 Aug 2026) — which is how
they enter the gate: a component without a story is a component axe never sees.

The 44px touch floors and the no-sideways-scroll facts at 390px are asserted by the
`*.mobile.spec.ts` files under `bun run test:mobile`, in a real Chromium, against the real
stylesheet.

Both suites run in CI (`.github/workflows/ci.yml`) with no secrets and no database.

## Deploying

Coolify, with the **Railpack** build pack, is the default target. `railpack.json` is the repo's
half: it runs `db:migrate:deploy` ahead of `vite build` (the WHY is in
`scripts/migrate-deploy.ts`) and starts the server as `node build` directly, because
`bun run start` does not pass SIGTERM on, and every redeploy would kill in-flight requests
instead of draining them. The rest is Coolify settings:

- **Build Command, Start Command:** leave both empty. `railpack.json` sets both and wins over
  anything typed there, so a value in those fields would only mislead the next reader.
- **Runtime variables:** `DATABASE_URL`, `ORIGIN` (the public URL; without it every form POST is
  refused), `BETTER_AUTH_SECRET`, and the optional sign-in and mail pairs from `.env.example`.
- **`DATABASE_MIGRATION_URL`:** Build time on, Runtime off.
- **Ports Exposes:** 3000, adapter-node's default `PORT`.
- **Preview deployments** run the migrator too, with their own variables: point them at a
  preview database or leave them off, never at production's.

Vercel builds too: `VERCEL=1` selects adapter-vercel, and `vercel.json` runs the same migrator.

## Recreating this project

To recreate this project with the same configuration:

```sh
bun x sv@0.16.6 create --template minimal --types ts --add prettier eslint tailwindcss="plugins:typography,forms" drizzle="database:postgresql+postgresql:neon" better-auth="demo:password" storybook mcp="ide:claude-code+setup:remote" --install bun cjs
```
