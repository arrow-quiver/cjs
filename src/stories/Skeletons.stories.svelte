<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RouteSkeleton } from '$lib/components/skeletons';

	const { Story } = defineMeta({
		title: 'Motion/Route skeletons',
		parameters: { layout: 'fullscreen' }
	});
</script>

<!--
	Every screen's skeleton, as the shell draws it in the content area while the page is on its way.
	Compare one with its screen side by side: the title, the tabs and the start of the list should
	sit exactly where the real ones will. One story per entry in `routes.ts`.
-->

<Story name="Home" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)" />
	</div>
</Story>

<Story name="Module card" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/[module=module]" />
	</div>
</Story>

<Story name="Quote list" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/quoting" />
	</div>
</Story>

<Story name="Quote editor" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/quoting/[id]" />
	</div>
</Story>

<Story name="Invoice list" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/invoicing" />
	</div>
</Story>

<Story name="Invoice" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/invoicing/[id]" />
	</div>
</Story>

<Story name="Invoice workings" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/invoicing/[id]/workings" />
	</div>
</Story>

<Story name="Stock list" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/inventory" />
	</div>
</Story>

<Story name="Stock item" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/inventory/[id]" />
	</div>
</Story>

<Story name="Stock count" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/inventory/counts/[id]" />
	</div>
</Story>

<Story name="Settings" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/settings" />
	</div>
</Story>

<Story name="Settings · modules" asChild>
	<div class="h-svh overflow-y-auto bg-surface-base">
		<RouteSkeleton routeId="/(app)/settings/modules" />
	</div>
</Story>
