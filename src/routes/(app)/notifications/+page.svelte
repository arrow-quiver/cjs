<script lang="ts">
	/**
	 * NOTIFICATIONS, NEWEST FIRST.
	 *
	 * A quiet screen: rows, a dot on the unread ones, and one button that marks the lot read.
	 * Each row goes where its fact lives — the job, usually.
	 */
	import { enhance } from '$app/forms';
	import { Button, EmptyState } from '$lib/ui';
	import { submission } from '$lib/components/motion';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const reading = submission();
</script>

<svelte:head><title>Notifications · CJs</title></svelte:head>

<div class="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-[24px] font-semibold text-ink">Notifications</h1>
			<p class="mt-1 text-ui text-ink-secondary">
				{data.unreadHere === 0 ? 'Nothing waiting on you.' : `${data.unreadHere} unread.`}
			</p>
		</div>
		{#if data.unreadHere > 0}
			<form method="POST" action="?/read" use:enhance={reading.enhance}>
				<Button
					type="submit"
					variant="secondary"
					class="h-11 lg:h-9"
					pending={reading.pending}
					pendingLabel="Marking…"
				>
					Mark all as read
				</Button>
			</form>
		{/if}
	</div>

	{#if data.items.length === 0}
		<div class="mt-10">
			<EmptyState
				heading="Nothing here yet"
				body="When a job is assigned to you, it lands here with the day and the time."
			/>
		</div>
	{:else}
		<ul
			class="mt-6 divide-y divide-line-subtle rounded-[10px] border border-line-default bg-surface-card"
		>
			{#each data.items as item (item.id)}
				<li>
					<svelte:element
						this={item.href ? 'a' : 'div'}
						href={item.href ?? undefined}
						class="flex min-h-11 items-start gap-3 px-5 py-3.5 outline-none {item.href
							? 'transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid'
							: ''}"
					>
						<span
							aria-hidden="true"
							class="mt-[7px] size-2 shrink-0 rounded-full {item.read
								? 'bg-transparent'
								: 'bg-brand-ink'}"
						></span>
						<span class="min-w-0 flex-1">
							<span class="block text-ui font-medium text-ink">
								{item.title}
								{#if !item.read}<span class="sr-only">(unread)</span>{/if}
							</span>
							{#if item.detail}
								<span class="mt-0.5 block text-helper text-ink-secondary">{item.detail}</span>
							{/if}
						</span>
						<span class="shrink-0 text-helper text-ink-muted">{item.when}</span>
					</svelte:element>
				</li>
			{/each}
		</ul>
	{/if}
</div>
