/**
 * THE ARCHITECTURE ZONES, PROVED TO FIRE.
 *
 * Every zone in `eslint.config.js` was once configured under the same two rule names, and flat
 * config merges options last-match-wins, so the last zone to match a file silently replaced the
 * others. Zones 1 to 9 fired on nothing for most of the codebase, the config looked right, and
 * `bun run lint` stayed green. A lint rule that never fires cannot be told apart from a codebase
 * that never breaks it, which is why this file exists.
 *
 * Each row lints a snippet as if it lived at a given path. The file does not have to exist, so
 * every path is `.ts`: the `.svelte` block turns on the type-aware project service, which needs
 * a real file.
 */
import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { ZONE_RULES } from './eslint.config.js';

type Row = {
	/** The zone rule this row proves, without the `zones/` prefix. */
	readonly zone: keyof typeof ZONE_RULES;
	readonly code: string;
	/** A path inside the zone, where the snippet must be reported. */
	readonly fires: string;
	/** A path the zone exempts on purpose, where the same snippet must pass. */
	readonly exempt: string;
};

const ROUTE = 'src/routes/(app)/quoting/+page.server.ts';
const MODULE = 'src/lib/server/modules/quoting/effects.ts';

const ROWS: readonly Row[] = [
	{
		zone: 'db-client',
		code: "import { unsafeDb } from '$lib/server/core/db/client';\nexport { unsafeDb };",
		fires: ROUTE,
		exempt: 'src/lib/server/core/ctx.ts'
	},
	{
		zone: 'db-client-dynamic',
		code: "export const load = async () => (await import('$lib/server/core/db/client')).unsafeDb;",
		fires: ROUTE,
		exempt: 'src/lib/server/core/jobs/jobs.test.ts'
	},
	{
		zone: 'ui-barrel',
		code: "import { Button } from '$lib/components/ui/button';\nexport { Button };",
		fires: 'src/routes/(app)/quoting/+page.ts',
		exempt: 'src/lib/components/shell/nav.ts'
	},
	{
		zone: 'cross-module',
		code: "import { issueInvoice } from '$lib/server/modules/invoicing/send';\nexport { issueInvoice };",
		fires: MODULE,
		exempt: 'src/lib/server/modules/quoting/quoting.test.ts'
	},
	{
		zone: 'float-columns',
		code: "import { real } from 'drizzle-orm/pg-core';\nexport { real };",
		fires: 'src/lib/server/core/db/schema/core.ts',
		exempt: 'src/lib/server/core/pdf/layout.ts'
	},
	{
		zone: 'money-ctor',
		code: "import { money } from '$lib/core/money/ctor';\nexport { money };",
		fires: MODULE,
		exempt: 'src/lib/server/core/db/map.ts'
	},
	{
		zone: 'money-ctor-dynamic',
		code: "export const make = async () => (await import('$lib/core/money/ctor')).money;",
		fires: MODULE,
		exempt: 'src/lib/core/money/parse.ts'
	},
	{
		zone: 'float-money',
		code: "export const amount = parseFloat('12.50');",
		fires: MODULE,
		exempt: 'src/lib/core/money/parse.ts'
	},
	{
		zone: 'payment-sdk',
		code: "import Stripe from 'stripe';\nexport { Stripe };",
		fires: 'src/lib/server/core/billing/charge.ts',
		exempt: 'src/lib/server/core/billing/adapters/stripe.ts'
	},
	{
		zone: 'system-principal',
		code: "import { withSystem } from '$lib/server/core/system';\nexport { withSystem };",
		fires: ROUTE,
		exempt: 'src/lib/server/core/sweeper.ts'
	},
	{
		zone: 'system-principal-dynamic',
		code: "export const run = async () => (await import('$lib/server/core/system')).withSystem;",
		fires: ROUTE,
		exempt: 'src/lib/server/core/sweeper.ts'
	},
	{
		zone: 'fixtures',
		code: "import { createUser } from '$lib/server/core/db/fixtures';\nexport { createUser };",
		fires: ROUTE,
		exempt: 'src/lib/server/modules/quoting/quoting.test.ts'
	},
	{
		zone: 'fixtures-dynamic',
		code: "export const seed = async () => (await import('$lib/server/core/db/fixtures')).createUser;",
		fires: ROUTE,
		exempt: 'src/lib/server/modules/quoting/sharing.test.ts'
	},
	{
		zone: 'no-timers',
		code: 'export const tick = () => setInterval(() => undefined, 1_000);',
		fires: 'src/lib/server/core/billing/undo.ts',
		exempt: 'src/lib/server/core/ratelimit.ts'
	},
	{
		zone: 'validation-barrel',
		code: "import { check } from '$lib/core/validation/zod';\nexport { check };",
		fires: ROUTE,
		exempt: 'src/lib/core/validation/index.ts'
	}
];

let eslint: ESLint;

beforeAll(() => {
	eslint = new ESLint({ cwd: import.meta.dirname });
});

async function lint(code: string, filePath: string): Promise<Linter.LintMessage[]> {
	const [result] = await eslint.lintText(code, { filePath, warnIgnored: true });
	// A snippet that does not parse reports nothing from any zone, which would pass every
	// "exempt" row for the wrong reason.
	const fatal = result.messages.filter((m) => m.fatal);
	expect(fatal, `${filePath} did not parse`).toEqual([]);
	return result.messages;
}

async function zonesAt(code: string, filePath: string): Promise<string[]> {
	const messages = await lint(code, filePath);
	return [...new Set(messages.flatMap((m) => (m.ruleId?.startsWith('zones/') ? [m.ruleId] : [])))];
}

describe('every architecture zone fires', { timeout: 60_000 }, () => {
	it('has a row for every zone rule', () => {
		const covered = new Set(ROWS.map((r) => r.zone));
		expect(Object.keys(ZONE_RULES).filter((zone) => !covered.has(zone as Row['zone']))).toEqual([]);
	});

	it.each(ROWS)('zones/$zone is reported at $fires', async ({ zone, code, fires }) => {
		expect(await zonesAt(code, fires)).toContain(`zones/${zone}`);
	});

	it.each(ROWS)('zones/$zone stays quiet at $exempt', async ({ zone, code, exempt }) => {
		expect(await zonesAt(code, exempt)).not.toContain(`zones/${zone}`);
	});
});

describe('the zones compose instead of replacing each other', { timeout: 60_000 }, () => {
	/**
	 * THE REGRESSION. One route that breaks six zones at once. Under the old config only the
	 * validation barrel was reported, because it matched every file and came last.
	 */
	it('reports every zone a single file breaks', async () => {
		const code = [
			"import { unsafeDb } from '$lib/server/core/db/client';",
			"import { money } from '$lib/core/money/ctor';",
			"import { withSystem } from '$lib/server/core/system';",
			"import { createUser } from '$lib/server/core/db/fixtures';",
			"import { check } from '$lib/core/validation/zod';",
			"import { Button } from '$lib/components/ui/button';",
			'export { unsafeDb, money, withSystem, createUser, check, Button };'
		].join('\n');

		expect((await zonesAt(code, ROUTE)).sort()).toEqual(
			[
				'zones/db-client',
				'zones/fixtures',
				'zones/money-ctor',
				'zones/system-principal',
				'zones/ui-barrel',
				'zones/validation-barrel'
			].sort()
		);
	});

	it('lets a module import another through its public front door', async () => {
		const code =
			"import { summariseInvoicing } from '$lib/server/modules/invoicing/public';\nexport { summariseInvoicing };";

		expect(await zonesAt(code, MODULE)).toEqual([]);
		expect(await zonesAt(code, 'src/lib/server/core/home/registry.ts')).toEqual([]);
	});

	it('holds server core to the module boundary', async () => {
		const code =
			"import { summarise } from '$lib/server/modules/inventory/summary';\nexport { summarise };";

		expect(await zonesAt(code, 'src/lib/server/core/home/registry.ts')).toContain(
			'zones/cross-module'
		);
	});

	it('still ignores the vendored shadcn primitives entirely', async () => {
		const messages = await lint(
			"import { unsafeDb } from '$lib/server/core/db/client';\nexport { unsafeDb };",
			'src/lib/components/ui/button/index.ts'
		);

		expect(messages.map((m) => m.message)).toEqual([
			expect.stringMatching(/ignored because of a matching ignore pattern/i)
		]);
	});
});
