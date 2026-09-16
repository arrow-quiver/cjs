/**
 * WHICH SKELETON STANDS IN FOR WHICH SCREEN.
 *
 * Keyed by SvelteKit route id, because that is what `navigating.to.route.id` says while the next
 * page is on its way. Every route under `(app)` with a `load` is either here or in
 * `NO_SKELETON` with its reason, and `skeletons.test.ts` fails a new route that is in neither.
 *
 * One skeleton per route even where a route draws more than one layout (a draft quote and a sent
 * one, a count in progress and one under review). It is drawn as the case a person most often
 * arrives at, and the rarer case is allowed to settle into its own shape.
 */
import type { Component } from 'svelte';
import type { RouteId } from '$app/types';
import CountSheetSkeleton from './CountSheetSkeleton.svelte';
import HomeSkeleton from './HomeSkeleton.svelte';
import InvoiceDocumentSkeleton from './InvoiceDocumentSkeleton.svelte';
import InvoiceListSkeleton from './InvoiceListSkeleton.svelte';
import ItemDetailSkeleton from './ItemDetailSkeleton.svelte';
import ItemListSkeleton from './ItemListSkeleton.svelte';
import JobDetailSkeleton from './JobDetailSkeleton.svelte';
import JobListSkeleton from './JobListSkeleton.svelte';
import ModuleCardSkeleton from './ModuleCardSkeleton.svelte';
import NotificationsSkeleton from './NotificationsSkeleton.svelte';
import PeopleSkeleton from './PeopleSkeleton.svelte';
import QuoteEditorSkeleton from './QuoteEditorSkeleton.svelte';
import QuoteListSkeleton from './QuoteListSkeleton.svelte';
import SettingsSkeleton from './SettingsSkeleton.svelte';
import WeekSkeleton from './WeekSkeleton.svelte';
import WorkingsSkeleton from './WorkingsSkeleton.svelte';

export const ROUTE_SKELETONS = {
	'/(app)': HomeSkeleton,
	'/(app)/[module=module]': ModuleCardSkeleton,
	'/(app)/quoting': QuoteListSkeleton,
	'/(app)/quoting/[id]': QuoteEditorSkeleton,
	'/(app)/invoicing': InvoiceListSkeleton,
	'/(app)/invoicing/[id]': InvoiceDocumentSkeleton,
	'/(app)/invoicing/[id]/workings': WorkingsSkeleton,
	'/(app)/inventory': ItemListSkeleton,
	'/(app)/inventory/[id]': ItemDetailSkeleton,
	'/(app)/inventory/counts/[id]': CountSheetSkeleton,
	'/(app)/notifications': NotificationsSkeleton,
	'/(app)/scheduling': JobListSkeleton,
	'/(app)/scheduling/[id]': JobDetailSkeleton,
	'/(app)/scheduling/people': PeopleSkeleton,
	'/(app)/scheduling/week': WeekSkeleton,
	'/(app)/settings': SettingsSkeleton,
	'/(app)/settings/modules': SettingsSkeleton
} satisfies Partial<Record<RouteId, Component>>;

/**
 * Routes with a `load` that deliberately have no skeleton, and why. Empty today: every screen that
 * waits on the server has one. A route that only redirects would belong here.
 */
export const NO_SKELETON = {} satisfies Partial<Record<RouteId, string>>;

/** The skeleton for a destination, or null when it has none. */
export function skeletonFor(routeId: string | null): Component | null {
	if (routeId === null) return null;
	return (ROUTE_SKELETONS as Readonly<Record<string, Component>>)[routeId] ?? null;
}
