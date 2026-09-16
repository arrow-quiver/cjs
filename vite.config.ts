/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = import.meta.dirname;

/** Everything under core and components is database-free by construction. */
const PURE_TESTS = [
	'src/lib/core/**/*.{test,spec}.{js,ts}',
	'src/lib/components/**/*.{test,spec}.{js,ts}'
];

// SvelteKit configuration — adapter, forced runes mode, tsconfig includes — lives in
// svelte.config.js, which is the file vite-plugin-svelte, Vitest, svelte-check and the
// shadcn-svelte CLI all read. Inline config here left them guessing.
// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		// `storybook/test` reaches @testing-library/dom through a deep import, so Vite never
		// sees a bare specifier for it and leaves it un-prebundled. Its CJS dependency tree —
		// aria-query, lz-string, dom-accessibility-api, pretty-format — is then served to the
		// browser as raw CommonJS, and every story file dies during setup on
		// `does not provide an export named 'elementRoles'` before a single test runs.
		// Naming the parent is enough; the optimizer pulls the whole tree in with it.
		include: [
			'@testing-library/dom',
			'storybook/test',
			// The shell imports its glyphs one file at a time (`@lucide/svelte/icons/house`),
			// which is what keeps the client bundle to the eight icons it uses instead of the
			// whole set. Vite does not discover deep paths until the first story asks for one —
			// and by then the story run is underway, so the optimizer re-bundles and reloads
			// mid-test: "Vite unexpectedly reloaded a test". Naming the directory up front
			// means the icons are already there when the first story mounts.
			'@lucide/svelte/icons/*'
		]
	},
	test: {
		projects: [
			// Tests that need nothing but Node: money arithmetic, validation, copy, tokens, and the
			// architecture zones in `eslint.config.test.ts`. No setup file and no database, which
			// is what lets CI run them on every pull request without a credential. A test that
			// needs the database belongs in `unit`; one that lands here by mistake fails in CI on
			// its first connection, which is the right place to find out.
			{
				extends: true,
				test: {
					name: 'pure',
					environment: 'node',
					include: [...PURE_TESTS, 'eslint.config.test.ts'],
					exclude: ['src/**/*.stories.*', 'src/**/*.mobile.spec.ts', 'src/**/*.cls.spec.ts']
				}
			},
			// Node tests against the database: tenancy, entitlement, audit, registry invariants.
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: [
						'src/**/*.stories.*',
						'src/**/*.mobile.spec.ts',
						'src/**/*.cls.spec.ts',
						...PURE_TESTS
					],
					// A large part of this project asserts Row Level Security, and every one of
					// those assertions is worth nothing if the connection can bypass a policy.
					// The setup file proves it cannot, once per worker, before any suite runs —
					// see scripts/vitest-setup.ts for why the default state of an unconfigured
					// checkout gets this wrong and what to do about it.
					setupFiles: [path.join(dirname, 'scripts/vitest-setup.ts')]
				}
			},
			{
				extends: true,
				plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
				test: {
					name: 'stories-light',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' }]
					}
				}
			},
			{
				extends: true,
				plugins: [
					storybookTest({
						configDir: path.join(dirname, '.storybook'),
						initialGlobals: { theme: 'dark' }
					})
				],
				test: {
					name: 'stories-dark',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' }]
					}
				}
			},
			// Layout shift: skeletons against the screens they stand in for, at the design's two
			// frames. Two projects rather than two instances, so each reports under its own name.
			...(
				[
					['cls-phone', { width: 390, height: 844 }],
					['cls-desktop', { width: 1280, height: 800 }]
				] as const
			).map(([name, viewport]) => ({
				extends: true as const,
				test: {
					name,
					include: ['src/**/*.cls.spec.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' as const, viewport }]
					}
				}
			})),
			// Component-level phone assertions (44px targets, no horizontal overflow).
			// Full check-and-act FLOWS live in e2e/ under real Playwright — Vitest browser
			// mode is a component runner and cannot navigate server routes or kill a tab.
			{
				extends: true,
				test: {
					name: 'mobile',
					include: ['src/**/*.mobile.spec.ts'],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium', viewport: { width: 390, height: 844 } }]
					}
				}
			}
		],
		coverage: {
			provider: 'v8',
			include: ['src/lib/**'],
			// Vendored shadcn primitives must not dilute the coverage target.
			exclude: ['src/lib/components/ui/**', 'src/**/*.stories.*'],
			thresholds: {
				// The brief: "Financial accuracy is absolute. Rounding and precision errors in
				// money are not acceptable defects." Nothing in the money engine ships
				// unexercised — not one branch. This is a ratchet, not an aspiration.
				'src/lib/core/money/**': {
					statements: 100,
					branches: 100,
					functions: 100,
					lines: 100
				}
			}
		}
	}
});
