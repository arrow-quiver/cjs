<script lang="ts">
	/**
	 * THE SHELL.
	 *
	 * Two real layouts, one breakpoint, no tablet in between. The design draws a desktop
	 * shell and a 390 × 844 phone and nothing between them, so above the breakpoint the
	 * desktop shell renders and lets the CONTENT area do its own narrowing — a third,
	 * undesigned intermediate would be an invention.
	 *
	 * `lg` (1024px) is the breakpoint. The sidebar is 272px fixed, and below about 1000px the
	 * remaining column stops being enough for a table of line items.
	 *
	 * THE SHELL DOES NOT SCROLL
	 * -------------------------
	 * `h-svh` with `overflow-hidden` on the frame and `overflow-y-auto` on the one element
	 * that should move. `svh` rather than `vh` because mobile browsers lie about `vh` while
	 * their address bar is retracting, which puts the bottom nav under the chrome.
	 */
	import { navigating, page } from '$app/state';
	import { brandAttrs } from '$lib/ui';
	import { ActivityBar, activity, motionMs } from '$lib/components/motion';
	import { RouteSkeleton, skeletonFor } from '$lib/components/skeletons';
	import AppSidebar from '$lib/components/shell/AppSidebar.svelte';
	import AppTopBar from '$lib/components/shell/AppTopBar.svelte';
	import CommandBar from '$lib/components/shell/CommandBar.svelte';
	import MobileHeader from '$lib/components/shell/MobileHeader.svelte';
	import MobileNav from '$lib/components/shell/MobileNav.svelte';
	import { mobileNav } from '$lib/components/shell/nav';
	import type { SearchGroup } from '$lib/core/search';
	import type { LayoutServerData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();

	/**
	 * WHERE THE PERSON IS GOING, NOT ONLY WHERE THEY ARE. The nav highlights the destination the
	 * moment it is tapped, so the press is acknowledged before the next page has loaded, which on
	 * a phone on a site is the slow part. If the navigation is abandoned, `navigating.to` clears
	 * and the highlight returns to the page that is still showing.
	 */
	const pathname = $derived(navigating.to?.url.pathname ?? page.url.pathname);

	/** A page on its way, or a form waiting on the server. Drawn as the activity bar. */
	const busy = $derived(navigating.to !== null || activity.busy);

	/**
	 * THE SKELETON FOR THE NEXT SCREEN, AND WHEN TO SHOW IT.
	 *
	 * Only for a different ROUTE: a filter tab, a sort or a page of the same list stays on its route,
	 * is acknowledged by the tab and the bar, and would only flash if the list blanked on every tap.
	 *
	 * Only after `--motion-base`. Most navigations here are preloaded and land sooner than that, and a
	 * skeleton that appears for a frame and vanishes is the flicker this exists to prevent. The bar
	 * has already acknowledged the tap, so waiting costs nothing.
	 *
	 * The leaving page stays MOUNTED, only hidden, while the skeleton shows. A navigation that is
	 * abandoned hands back the page exactly as it was, unsaved edits in an editor included.
	 */
	const destination = $derived(navigating.to?.route.id ?? null);
	const changingScreen = $derived(
		destination !== null && destination !== page.route.id && skeletonFor(destination) !== null
	);
	let skeleton = $state<string | null>(null);

	$effect(() => {
		if (!changingScreen || destination === null) {
			skeleton = null;
			return;
		}
		const next = destination;
		const timer = setTimeout(() => (skeleton = next), motionMs('--motion-base'));
		return () => clearTimeout(timer);
	});
	const phoneNav = $derived(mobileNav(data.access));

	/**
	 * The one call the bar makes, and it is a GET that reads.
	 *
	 * Passed in as a function rather than fetched inside the component so the bar can be
	 * rendered in a story and asserted in a test without a server — and so there is exactly
	 * one place to look for what the command bar talks to.
	 */
	async function search(query: string): Promise<readonly SearchGroup[]> {
		const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
		if (!response.ok) return [];
		return (await response.json()) as SearchGroup[];
	}

	/**
	 * The single palette instance. Both triggers call into it.
	 *
	 * Null until it mounts, and null for the whole session when AI is off — which is why
	 * every caller is `?.` rather than `!`: with the bar gone the triggers are gone too, and
	 * nothing else in the shell reaches for it.
	 */
	let palette = $state<{ openBar: () => void } | null>(null);
</script>

<!--
	The brand attributes go on the shell root itself rather than in a `BrandScope` wrapper —
	which is what `BrandScope`'s own note asks for. Only `--brand` changes per tenant; the
	whole ramp re-derives from it in `layout.css`.
-->
<div
	{...brandAttrs(data.tenant.brandColor)}
	class="flex h-svh flex-col overflow-hidden bg-surface-base lg:flex-row"
>
	<!-- Desktop: the sidebar is the nav. -->
	<div class="hidden lg:flex">
		<AppSidebar
			tradingName={data.tenant.name}
			initials={data.tenant.initials}
			subtitle={data.tenant.subtitle}
			groups={data.nav}
			{pathname}
			monthlyTotal={data.monthlyTotal}
		/>
	</div>

	<div class="flex min-w-0 flex-1 flex-col overflow-hidden">
		<div class="hidden lg:block">
			<AppTopBar
				aiEnabled={data.aiEnabled}
				today={data.today}
				userInitials={data.person.initials}
				userName={data.person.name}
				onSearch={() => palette?.openBar()}
			/>
		</div>

		<div class="lg:hidden">
			<MobileHeader
				tradingName={data.tenant.name}
				initials={data.tenant.initials}
				userInitials={data.person.initials}
				userName={data.person.name}
				aiEnabled={data.aiEnabled}
				onSearch={() => palette?.openBar()}
			/>
		</div>

		<ActivityBar {busy} />

		<!-- The only thing that scrolls. -->
		<main class="min-h-0 flex-1 overflow-y-auto" aria-busy={busy}>
			{#if skeleton}
				<RouteSkeleton routeId={skeleton} />
			{/if}
			<div class={skeleton ? 'hidden' : 'contents'}>
				{@render children()}
			</div>
		</main>

		<div class="lg:hidden">
			<MobileNav nav={phoneNav} {pathname} />
		</div>
	</div>

	<!--
	One dialog for both triggers. The mobile header's 44px field and the top bar's 34px
	control are two ways into the same surface; mounting the palette per breakpoint would put
	two ⌘K listeners on the window, and the keystroke would open a dialog and toggle it shut
	in the same tick.

	Absent entirely when AI is off — and that removes the bar, not a capability: every
	destination it can reach is in the sidebar and the bottom nav, asserted in
	`search.test.ts` rather than assumed.
-->
	{#if data.aiEnabled}
		<CommandBar bind:this={palette} {search} />
	{/if}
</div>
