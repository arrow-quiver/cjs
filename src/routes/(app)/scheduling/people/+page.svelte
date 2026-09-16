<script lang="ts">
	/**
	 * THE ROSTER: employees, teams, and who is on which.
	 *
	 * Deliberately flat. Capacity, skills, leave and induction belong to the team module the
	 * client asked to have specced later; this screen is the list the schedule needs today.
	 */
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button, EmptyState, Field, Input } from '$lib/ui';
	import { submission } from '$lib/components/motion';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const addingPerson = submission(() => async ({ update }) => {
		await update();
	});
	const addingTeam = submission(() => async ({ update }) => {
		await update();
	});
	const toggling = submission();

	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
</script>

<svelte:head><title>People · Jobs · CJs</title></svelte:head>

<div class="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
	<a
		href={resolve('/scheduling/week')}
		class="text-helper text-ink-secondary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
	>
		This week
	</a>
	<h1 class="mt-2 text-[24px] font-semibold text-ink">People</h1>
	<p class="mt-1 text-ui text-ink-secondary">
		Who carries the tools. A person can be on any number of teams, or none.
	</p>

	<div class="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
		<section aria-labelledby="people-heading">
			<h2 id="people-heading" class="text-[16px] font-medium text-ink">Employees</h2>

			{#if !data.readOnly}
				<form
					method="POST"
					action="?/addEmployee"
					use:enhance={addingPerson.enhance}
					class="mt-3 flex flex-wrap items-end gap-2"
				>
					<Field
						label="Add a person"
						id="employee-name"
						error={errors.employeeName ?? null}
						class="min-w-52 flex-1"
					>
						{#snippet control(field)}
							<Input {...field} name="employeeName" autocomplete="off" placeholder="Thabo Nkosi" />
						{/snippet}
					</Field>
					<Button
						type="submit"
						class="h-11 lg:h-9"
						pending={addingPerson.pending}
						pendingLabel="Adding…"
					>
						Add person
					</Button>
				</form>
			{/if}

			{#if data.employees.length === 0}
				<div class="mt-4">
					<EmptyState
						heading="Nobody on the list yet"
						body="Add the people who do the work. Assigning a job needs somebody to assign."
					/>
				</div>
			{:else}
				<ul
					class="mt-4 divide-y divide-line-subtle rounded-[10px] border border-line-default bg-surface-card"
				>
					{#each data.employees as person (person.id)}
						<li class="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
							<span class="min-w-0 flex-1 truncate text-ui font-medium text-ink">{person.name}</span
							>
							{#if data.teams.length > 0}
								<span class="flex flex-wrap items-center gap-1.5">
									{#each data.teams as crew (crew.id)}
										{@const on = person.teamIds.includes(crew.id)}
										{#if data.readOnly}
											{#if on}
												<span
													class="rounded-full bg-surface-raised px-2.5 py-1 text-helper text-ink-secondary"
												>
													{crew.name}
												</span>
											{/if}
										{:else}
											<form method="POST" action="?/membership" use:enhance={toggling.enhance}>
												<input type="hidden" name="employeeId" value={person.id} />
												<input type="hidden" name="teamId" value={crew.id} />
												<input type="hidden" name="on" value={String(!on)} />
												<button
													type="submit"
													aria-pressed={on}
													aria-label="{crew.name}: {on
														? `take ${person.name} off`
														: `put ${person.name} on`}"
													class="min-h-11 rounded-full border px-2.5 py-1 text-helper transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid lg:min-h-8 {on
														? 'border-brand-ink bg-brand-tint text-brand-ink'
														: 'border-line-control text-ink-secondary hover:border-line-strong'}"
												>
													{crew.name}
												</button>
											</form>
										{/if}
									{/each}
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section aria-labelledby="teams-heading">
			<h2 id="teams-heading" class="text-[16px] font-medium text-ink">Teams</h2>

			{#if !data.readOnly}
				<form
					method="POST"
					action="?/addTeam"
					use:enhance={addingTeam.enhance}
					class="mt-3 flex flex-wrap items-end gap-2"
				>
					<Field
						label="Add a team"
						id="team-name"
						error={errors.teamName ?? null}
						class="min-w-40 flex-1"
					>
						{#snippet control(field)}
							<Input {...field} name="teamName" autocomplete="off" placeholder="Install crew" />
						{/snippet}
					</Field>
					<Button
						type="submit"
						variant="secondary"
						class="h-11 lg:h-9"
						pending={addingTeam.pending}
						pendingLabel="Adding…"
					>
						Add team
					</Button>
				</form>
			{/if}

			{#if data.teams.length === 0}
				<p class="mt-4 text-helper text-ink-muted">
					No teams yet. A person can be assigned on their own; teams are for the big jobs.
				</p>
			{:else}
				<ul
					class="mt-4 divide-y divide-line-subtle rounded-[10px] border border-line-default bg-surface-card"
				>
					{#each data.teams as crew (crew.id)}
						<li class="flex min-h-11 items-center gap-3 px-5 py-3">
							<span class="min-w-0 flex-1 truncate text-ui font-medium text-ink">{crew.name}</span>
							<span class="shrink-0 text-helper text-ink-muted">
								{crew.memberCount === 1 ? '1 person' : `${crew.memberCount} people`}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
