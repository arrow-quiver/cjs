// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

/**
 * ── ARCHITECTURE ZONES ────────────────────────────────────────────────────────────────
 *
 * These rules are not style. They are the boundaries that make the architecture real: a
 * module author cannot reach the unscoped database handle, cannot import another module's
 * internals, cannot declare a float money column, and cannot construct Money by hand.
 *
 * Several point at directories that do not exist yet (they land in M2–M4). That is
 * deliberate — a boundary has to be in place before the first line of code inside it, not
 * retrofitted after something has already crossed it.
 *
 * ── WHY EVERY ZONE HAS ITS OWN RULE NAME ─────────────────────────────────────────────
 *
 * Flat config merges rule options last-match-wins, per rule name. When every zone was
 * configured as `no-restricted-imports`, a later zone matching the same file REPLACED the
 * earlier zones' options instead of adding to them. Zone 11 matches every file and came
 * last, so for most of the codebase zones 1 to 9 fired on nothing, and nothing said so.
 *
 * So each zone is its own rule: the two core rules, re-exposed under the `zones` plugin with
 * one name per zone. Two blocks can only overwrite each other now if they name the same
 * zone, and `eslint.config.test.ts` proves every zone still fires on a file that breaks
 * several at once. A disable comment names the zone it is suppressing
 * (`zones/float-money`), which also says why.
 *
 * `no-restricted-imports` does not see `await import(...)`, so the zones that guard a
 * dangerous handle carry a `-dynamic` twin with the same `ignores`, matching both a string
 * and a template literal. Patterns match the path however it is spelled: `$lib/...`, a
 * relative `../db/client` from inside `server/core`, and with or without an extension.
 */
const coreRule = (name) => {
	const rule = builtinRules.get(name);
	if (!rule) {
		// Loud on purpose. Without this the zones would quietly fire on nothing again.
		throw new Error(
			`eslint.config.js: ESLint no longer exposes the core rule "${name}", which every architecture zone is built on.`
		);
	}
	return rule;
};
const restrictedImports = coreRule('no-restricted-imports');
const restrictedSyntax = coreRule('no-restricted-syntax');

export const ZONE_RULES = {
	'db-client': restrictedImports,
	'db-client-dynamic': restrictedSyntax,
	'ui-barrel': restrictedImports,
	'cross-module': restrictedImports,
	'float-columns': restrictedImports,
	'money-ctor': restrictedImports,
	'money-ctor-dynamic': restrictedSyntax,
	'float-money': restrictedSyntax,
	'payment-sdk': restrictedImports,
	'payment-sdk-dynamic': restrictedSyntax,
	'system-principal': restrictedImports,
	'system-principal-dynamic': restrictedSyntax,
	fixtures: restrictedImports,
	'fixtures-dynamic': restrictedSyntax,
	'no-timers': restrictedSyntax,
	'validation-barrel': restrictedImports,
	'test-modules': restrictedImports
};

const zonesPlugin = { meta: { name: 'zones' }, rules: ZONE_RULES };

/**
 * A `-dynamic` twin: the same boundary, for `import()` of a path matching `pattern`, written
 * as a string or as a template literal (`import(\`...\`)` has no `.value` to match).
 */
const dynamicImport = (pattern, message) => [
	'error',
	{ selector: `ImportExpression[source.value=${pattern}]`, message },
	{
		selector: `ImportExpression > TemplateLiteral > TemplateElement[value.cooked=${pattern}]`,
		message
	}
];

export const architectureZones = [
	// 1. Nobody outside db/ may touch the unscoped connection.
	//
	//    `ctx.ts` is on this list because it IS the exception the architecture describes:
	//    the one module that takes the unscoped handle, establishes tenancy, attribution and
	//    entitlement on it, and hands out a branded `Tx`. `hooks.server.ts` is here for the
	//    single query that must run before a tenant exists — resolving which business a
	//    signed-in person is acting for.
	{
		name: 'zones/db-client',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: [
			'src/lib/server/core/db/**',
			'src/lib/server/core/ctx.ts',
			// The second door, and the only other one: the public quote page, for a client who
			// is not a user. Kept as its own file so the blast radius of the one
			// unauthenticated path in the product is visible in the file list.
			'src/lib/server/core/share.ts',
			'src/lib/server/auth.ts',
			'src/hooks.server.ts',
			// Tests are where the unscoped connection is the thing under test: RLS is proved by
			// connecting as the application role and watching a policy refuse.
			'src/**/*.test.ts',
			'src/**/*.spec.ts'
		],
		rules: {
			'zones/db-client': [
				'error',
				{
					patterns: [
						{
							group: ['**/db/client', '**/db/client.*'],
							message:
								'Never import unsafeDb. Take a Ctx from withModule(event, key, intent) — the only route to the database, and what applies tenancy, entitlement and audit.'
						}
					]
				}
			],
			'zones/db-client-dynamic': dynamicImport(
				'/(^|\\/)db\\/client(\\.[a-z]+)?$/',
				'Never import unsafeDb, dynamically or otherwise. Take a Ctx from withModule(event, key, intent).'
			)
		}
	},

	// 2. Modules import UI from $lib/ui only, so every module looks like the product.
	{
		name: 'zones/ui-barrel',
		files: ['src/lib/modules/**', 'src/routes/(app)/**'],
		rules: {
			'zones/ui-barrel': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/components/ui/*', '$lib/components/ui'],
							message:
								'Modules import UI from $lib/ui only. $lib/components/ui is vendored shadcn — wrap it in the design system first, so all twelve modules change together.'
						}
					]
				}
			]
		}
	},

	// 3. Modules never import each other except through <module>/public.ts. Server core is held
	//    to the same boundary: Home's registry and the jobs queries read modules, and they
	//    read them through the same front door as everyone else.
	//
	//    A module's own files import each other relatively (`./effects`), which no pattern here
	//    matches. There used to be a block switching the rule off for a module's internals; it
	//    switched it off for every OTHER module's internals too, so it is gone. Tests reach
	//    into internals to seed state, and are exempt.
	{
		name: 'zones/cross-module',
		files: ['src/lib/server/modules/**', 'src/lib/modules/**', 'src/lib/server/core/**'],
		ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		rules: {
			'zones/cross-module': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/server/modules/*/*', '!$lib/server/modules/*/public'],
							message:
								'Cross-module server imports go through <module>/public.ts only. Anything else couples two modules and breaks graceful degradation when one is not owned. Within a module, import siblings relatively.'
						}
					]
				}
			]
		}
	},

	// 4. Float column types cannot even be declared. Money is int8 cents.
	{
		name: 'zones/float-columns',
		files: ['src/lib/server/**/schema*.ts', 'src/lib/server/**/schema/**/*.ts'],
		rules: {
			'zones/float-columns': [
				'error',
				{
					paths: [
						{
							name: 'drizzle-orm/pg-core',
							importNames: ['real', 'doublePrecision', 'numeric', 'decimal', 'money'],
							message:
								'Money is integer cents in int8. Use cents()/micros()/qtyE6()/ppm() from $lib/server/core/db/base.'
						}
					]
				}
			]
		}
	},

	// 5. Money constructors are reachable from three places only.
	{
		name: 'zones/money-ctor',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: [
			'src/lib/core/money/**',
			'src/lib/server/core/db/map.ts',
			'src/**/*.test.ts',
			'src/**/*.spec.ts'
		],
		rules: {
			'zones/money-ctor': [
				'error',
				{
					patterns: [
						{
							group: ['**/money/ctor', '**/money/ctor.*'],
							message:
								'Money is constructed by db/map.ts (from rows) or parseMoneyInput (from user input). There is no third way in.'
						}
					]
				}
			],
			'zones/money-ctor-dynamic': dynamicImport(
				'/(^|\\/)money\\/ctor(\\.[a-z]+)?$/',
				'Money is constructed by db/map.ts or parseMoneyInput. A dynamic import is not a third way in.'
			)
		}
	},

	// 6. Float-money smoke alarm. A BACKSTOP, not the lock — the lock is the type system.
	//    A legitimate non-money use needs an explicit eslint-disable with a reason.
	//    Suppress it with `zones/float-money`.
	{
		name: 'zones/float-money',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: ['src/lib/core/money/**'],
		rules: {
			'zones/float-money': [
				'error',
				{
					selector: "CallExpression[callee.name='parseFloat']",
					message: 'Money is integer cents. Use parseMoneyInput from $lib/core/money/parse.'
				},
				{
					selector: "MemberExpression[property.name='toFixed']",
					message: 'Use formatZar()/formatQty() from $lib/core/money/format.'
				},
				{
					selector:
						"MemberExpression[object.name='Math'][property.name=/^(round|floor|ceil|trunc)$/]",
					message:
						'Rounding money goes through roundDiv from $lib/core/money/math — the single rounding function in this codebase. For genuinely non-money maths, disable this rule on the line with a reason.'
				}
			]
		}
	},

	// 7. Only the billing adapter may import a payment provider SDK.
	{
		name: 'zones/payment-sdk',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: ['src/lib/server/core/billing/adapters/**'],
		rules: {
			'zones/payment-sdk': [
				'error',
				{
					paths: [
						{ name: 'stripe', message: 'Provider SDKs live inside their adapter.' },
						{ name: 'paystack-sdk', message: 'Provider SDKs live inside their adapter.' },
						{ name: '@paystack/inline-js', message: 'Provider SDKs live inside their adapter.' }
					]
				}
			],
			'zones/payment-sdk-dynamic': dynamicImport(
				'/^(stripe|paystack-sdk|@paystack\\/inline-js)(\\/.*)?$/',
				'Provider SDKs live inside their adapter, however they are imported.'
			)
		}
	},

	// 8. The system principal is for background jobs only. It runs without a user and
	//    without entitlement checks, so its blast radius is bounded by this list rather
	//    than by convention.
	{
		name: 'zones/system-principal',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: [
			'src/lib/server/core/system.ts',
			'src/lib/server/core/sweeper.ts',
			'src/lib/server/core/billing/reconciler.ts',
			'src/lib/server/core/export-cron.ts',
			'src/routes/api/billing/webhook/+server.ts',
			'src/**/*.test.ts'
		],
		rules: {
			'zones/system-principal': [
				'error',
				{
					patterns: [
						{
							// Any module named `system`, however it is reached. There is one, and a second
							// thing called that would deserve a different name anyway.
							group: ['**/system', '**/system.*'],
							message:
								'withSystem() runs without a user and without entitlement checks. It belongs to background jobs only — add the file to the allowlist in eslint.config.js if it genuinely is one.'
						}
					]
				}
			],
			'zones/system-principal-dynamic': dynamicImport(
				'/(^|\\/)system(\\.[a-z]+)?$/',
				'withSystem() belongs to background jobs only, however it is imported.'
			)
		}
	},

	// 9. Test fixtures connect as the DDL role and delete rows — two things the application
	//    must never do. They are useful enough to be tempting as a seeding shortcut, so the
	//    boundary is a rule rather than a comment.
	{
		name: 'zones/fixtures',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		rules: {
			'zones/fixtures': [
				'error',
				{
					patterns: [
						{
							group: ['**/db/fixtures', '**/db/fixtures.*', './fixtures', './fixtures.*'],
							message:
								'db/fixtures is test-only: it connects as the DDL role and deletes rows. Application code goes through withBusiness()/withModule().'
						}
					]
				}
			],
			'zones/fixtures-dynamic': dynamicImport(
				'/((^|\\/)db\\/|^\\.\\/)fixtures(\\.[a-z]+)?$/',
				'db/fixtures is test-only, however it is imported.'
			)
		}
	},

	// 10. Anti-dark-pattern: no countdowns anywhere near billing. The undo window shows a
	//     DATE, never a ticking clock. Manufactured urgency is off the table.
	{
		name: 'zones/no-timers',
		files: ['src/lib/server/core/billing/**', 'src/routes/(app)/settings/modules/**'],
		rules: {
			'zones/no-timers': [
				'error',
				{
					selector: "CallExpression[callee.name='setInterval']",
					message:
						'No timers in billing UI. A countdown is manufactured urgency — show the date the window closes.'
				}
			]
		}
	},

	// 11. The validation core is entered through its barrel, exactly as money is. The barrel
	//     is where THE STANDARD is written down, and a file that imports `./zod` or `./copy`
	//     directly has walked past the only place that explains what a message owes a person.
	//     The boundary goes in before the first line of code reaches around it.
	{
		name: 'zones/validation-barrel',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: ['src/lib/core/validation/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
		rules: {
			'zones/validation-barrel': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/core/validation/*', '**/core/validation/*'],
							message:
								'Import from $lib/core/validation. The barrel carries the message standard; reaching past it is how a boundary quietly grows a second front door.'
						}
					]
				}
			]
		}
	},

	// 12. Application code never imports a test module. Tests are exempt from zones 1, 5, 8 and
	//     9 because they have to reach the dangerous handles, so a file named `*.test.ts` that
	//     re-exported one would hand it to the app with no rule in the way.
	{
		name: 'zones/test-modules',
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		rules: {
			'zones/test-modules': [
				'error',
				{
					patterns: [
						{
							group: ['**/*.test', '**/*.test.*', '**/*.spec', '**/*.spec.*'],
							message:
								'Application code does not import test modules. Tests may reach the unscoped database and the fixtures; nothing they export belongs in the app.'
						}
					]
				}
			]
		}
	}
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		// Vendored shadcn-svelte primitives. Not ours to lint or to hold to our zones.
		ignores: ['src/lib/components/ui/**']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	storybook.configs['flat/recommended'],
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{ plugins: { zones: zonesPlugin } },
	...architectureZones
);
