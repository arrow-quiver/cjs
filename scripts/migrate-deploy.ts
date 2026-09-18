/**
 * Applies pending migrations at DEPLOY time, before the build.
 *
 * Until now a merge to main deployed code that assumed tables the deploy never created —
 * `build` is `vite build` and nothing else — so every schema-bearing merge depended on
 * somebody remembering to migrate by hand. This script runs first in the build step of the
 * Railpack image Coolify builds (railpack.json), so the schema lands in the same act that
 * ships the code that needs it, and a failed migration fails the build before anything
 * replaces the live version.
 *
 * Why not Coolify's deployment hooks: the pre-deployment command runs inside the container
 * being REPLACED, whose image predates this deploy's migrations, and is skipped on a first
 * deploy; the post-deployment command runs once the new code is already serving, and Coolify
 * marks the deploy successful even when it fails. Why not at container start: the running
 * app would then hold the owner role, which RLS does not apply to (see .env.example).
 *
 * Why not `drizzle-kit migrate`: against Neon it fails silently — spinner, exit code 1,
 * no error text, nothing applied. drizzle-orm's programmatic migrator uses the same
 * journal and the same `drizzle.__drizzle_migrations` bookkeeping, and reports its errors.
 * It also applies all pending migrations in ONE transaction, so a generated/hand-written
 * pair (0013/0014) lands whole or not at all.
 *
 * `DATABASE_MIGRATION_URL` is the owner/DDL role, per drizzle.config.ts. Its absence is an
 * error, not a skip: a deploy that cannot know the schema is current must not proceed.
 */
import net from 'node:net';
import dns from 'node:dns';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { verifyInvariants } from './invariants';

// The same Happy-Eyeballs guard as src/lib/server/core/db/client.ts: pg races IPv4/IPv6
// and folds a lost race into AggregateError [ETIMEDOUT]. Neon refuses IPv6 outright.
net.setDefaultAutoSelectFamily(false);
dns.setDefaultResultOrder('ipv4first');

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
	console.error('DATABASE_MIGRATION_URL is not set — refusing to build against an unknown schema.');
	process.exit(1);
}

/**
 * Neon scales to zero and the first connect or two often drops (`ETIMEDOUT`,
 * `Connection terminated unexpectedly`). One failure means nothing; six mean the
 * database is actually unreachable.
 */
async function connectWithRetry(attempts = 6): Promise<pg.Client> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
		try {
			await client.connect();
			return client;
		} catch (error) {
			lastError = error;
			console.error(
				`connect attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`
			);
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}
	}
	throw lastError;
}

const client = await connectWithRetry();
try {
	await migrate(drizzle(client), { migrationsFolder: './drizzle' });
	const { rows } = await client.query<{ count: string }>(
		'select count(*)::text as count from drizzle.__drizzle_migrations'
	);
	console.info(`migrations applied: ${rows[0].count} on record`);
} finally {
	await client.end();
}

// The same gate db:migrate runs: a schema that migrated but broke an invariant (RLS off,
// a grant missing, an unowned table) must fail the deploy here, not surface as a 500.
const result = await verifyInvariants(url);
if (!result.ok) {
	console.error(`invariants failed after migration:\n${result.message}`);
	process.exit(1);
}
console.info('invariants hold — proceeding to build');
