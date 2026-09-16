<script lang="ts">
	/**
	 * 56px: the command bar on the left, the date and the person on the right.
	 *
	 * The trigger is a 34px BUTTON that looks like a field. It looks like one because the
	 * design draws one; it is a button because what it opens is a dialog, and a real input
	 * here would take a keystroke and then throw it away when the dialog stole focus.
	 *
	 * THE ONE RULE THIS BAR ENFORCES
	 * ------------------------------
	 * The design is firm that the command bar is the only always-visible AI surface, and that
	 * turning AI off removes it "without taking any capability with it". So `aiEnabled` hides
	 * the trigger and NOTHING ELSE — no nav item, no action and no route is conditioned on it
	 * anywhere in the product. `search.test.ts` asserts that rather than trusting it.
	 */
	import Bell from '@lucide/svelte/icons/bell';
	import Search from '@lucide/svelte/icons/search';
	import { resolve } from '$app/paths';
	import * as Avatar from '$lib/components/ui/avatar/index.js';

	let {
		aiEnabled,
		/** Formatted on the server so the first paint and the hydrated one agree. */
		today,
		userInitials,
		userName,
		/** Unread notifications, counted on the server with the rest of the shell's facts. */
		unread = 0,
		onSearch
	}: {
		aiEnabled: boolean;
		today: string;
		userInitials: string;
		userName: string;
		unread?: number;
		onSearch: () => void;
	} = $props();
</script>

<header
	class="flex h-14 shrink-0 items-center gap-4 border-b border-line-subtle bg-surface-base px-7"
>
	<div class="min-w-0 flex-1">
		{#if aiEnabled}
			<button
				type="button"
				onclick={onSearch}
				class="flex h-[34px] w-full max-w-[380px] items-center gap-2 rounded-md border border-line-control bg-surface-card px-3 text-left text-ui text-ink-muted transition-colors outline-none hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
			>
				<Search size={15} aria-hidden="true" class="shrink-0" />
				<span class="min-w-0 flex-1 truncate">Search, or ask a question</span>
				<kbd
					class="shrink-0 rounded-sm border border-line-control px-1.5 py-0.5 numeric text-[11px]"
				>
					⌘K
				</kbd>
			</button>
		{/if}
	</div>

	<a
		href={resolve('/notifications')}
		aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
		class="relative flex size-[34px] shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors outline-none hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
	>
		<Bell size={17} aria-hidden="true" />
		{#if unread > 0}
			<span
				aria-hidden="true"
				class="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wrong-ink px-1 numeric text-[10px] leading-none font-medium text-surface-base"
			>
				{unread > 99 ? '99+' : unread}
			</span>
		{/if}
	</a>

	<span class="text-helper text-ink-muted">{today}</span>

	<Avatar.Root class="size-7">
		<Avatar.Fallback class="text-[11px]">
			<span class="sr-only">{userName}</span>
			<span aria-hidden="true">{userInitials}</span>
		</Avatar.Fallback>
	</Avatar.Root>
</header>
