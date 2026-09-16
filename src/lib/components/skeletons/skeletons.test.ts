/**
 * EVERY SCREEN THAT WAITS ON THE SERVER HAS A SKELETON, OR A REASON NOT TO.
 *
 * Reads the route tree rather than trusting the map. A new route under `(app)` with a `load` fails
 * here until it is given a skeleton in `routes.ts` or an entry in `NO_SKELETON` saying why it
 * needs none, and a key for a route that no longer exists fails too.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NO_SKELETON, ROUTE_SKELETONS, skeletonFor } from './routes';

const ROUTES = fileURLToPath(new URL('../../../routes/', import.meta.url));
const APP = join(ROUTES, '(app)');

const LOAD = /export\s+(?:const|async\s+function|function)\s+load\b/;

function routesWithLoad(dir: string): string[] {
	const here = ['+page.server.ts', '+page.ts']
		.map((name) => join(dir, name))
		.some((file) => existsSync(file) && LOAD.test(readFileSync(file, 'utf8')));

	const id = `/${relative(ROUTES, dir).replaceAll('\\', '/')}`;
	const below = readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.flatMap((entry) => routesWithLoad(join(dir, entry.name)));

	return here ? [id, ...below] : below;
}

describe('route skeletons', () => {
	const found = routesWithLoad(APP).sort();
	const accounted = [...Object.keys(ROUTE_SKELETONS), ...Object.keys(NO_SKELETON)].sort();

	it('reads the route tree it claims to', () => {
		// A walk that found nothing would make every assertion below vacuous.
		expect(found).toContain('/(app)');
		expect(found).toContain('/(app)/invoicing');
		expect(found.length).toBeGreaterThan(8);
	});

	it('gives every screen with a load a skeleton, or a recorded reason for none', () => {
		expect(found.filter((id) => !accounted.includes(id))).toEqual([]);
	});

	it('keeps no entry for a route that no longer loads', () => {
		expect(accounted.filter((id) => !found.includes(id))).toEqual([]);
	});

	it('never lists a route in both places', () => {
		expect(Object.keys(NO_SKELETON).filter((id) => id in ROUTE_SKELETONS)).toEqual([]);
	});

	it('answers null for a route it does not know, and for no route at all', () => {
		expect(skeletonFor('/(auth)/sign-in')).toBeNull();
		expect(skeletonFor(null)).toBeNull();
		expect(skeletonFor('/(app)/invoicing')).toBe(ROUTE_SKELETONS['/(app)/invoicing']);
	});
});
