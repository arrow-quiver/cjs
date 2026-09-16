<script lang="ts">
	/**
	 * PUTTING THIS JOB ON THE PLAN.
	 *
	 * Assignment happens here, on the job card, and nowhere else — not on a quote, not on an
	 * invoice. A slot is a pair of hands (a person or a team), a day and a stretch of the
	 * clock. A clash comes back as a sentence naming who is taken and by what, and the form
	 * keeps everything typed so the fix is one field, not five.
	 */
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		Button,
		Field,
		Input,
		Select,
		SelectContent,
		SelectGroup,
		SelectItem,
		SelectLabel,
		SelectTrigger
	} from '$lib/ui';
	import { submission } from '$lib/components/motion';
	import { formatMinuteOfDay, formatWeekdayDate } from '$lib/core/calendar';
	import type { EmployeeRow, ScheduleEntry, TeamRow } from '$lib/core/schedule';

	let {
		slots,
		employees,
		teams,
		readOnly = false
	}: {
		slots: readonly ScheduleEntry[];
		employees: readonly EmployeeRow[];
		teams: readonly TeamRow[];
		readOnly?: boolean;
	} = $props();

	let assignee = $state<string>('');

	/** The refusal belongs to this attempt; see `CreateJobDialog` for the argument. */
	let errors = $state<Readonly<Record<string, string>>>({});

	const booking = submission(() => async ({ result, update }) => {
		if (result.type === 'failure') {
			errors = (result.data?.errors as Record<string, string> | undefined) ?? {};
			return;
		}
		errors = {};
		await update({ reset: false });
	});
	const removing = submission();

	const label = $derived.by(() => {
		if (assignee.startsWith('employee:')) {
			return employees.find((person) => `employee:${person.id}` === assignee)?.name ?? 'Choose';
		}
		if (assignee.startsWith('team:')) {
			return teams.find((crew) => `team:${crew.id}` === assignee)?.name ?? 'Choose';
		}
		return 'Choose a person or a team';
	});
</script>

{#if slots.length > 0}
	<ul class="flex flex-col gap-2" aria-label="Scheduled slots">
		{#each slots as slot (slot.id)}
			<li
				class="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line-default bg-surface-card px-4 py-2.5"
			>
				<span class="min-w-0 flex-1 text-ui text-ink">
					{slot.assignee.name}
					<span class="text-ink-secondary">
						· {formatWeekdayDate(slot.day)},
						<span class="numeric"
							>{formatMinuteOfDay(slot.startMinute)} to {formatMinuteOfDay(slot.endMinute)}</span
						>
					</span>
				</span>
				{#if !readOnly}
					<form method="POST" action="?/unschedule" use:enhance={removing.enhance}>
						<input type="hidden" name="entryId" value={slot.id} />
						<Button
							type="submit"
							variant="secondary"
							class="h-11 lg:h-9"
							pending={removing.pending}
							pendingLabel="Removing…"
						>
							Remove
							<span class="sr-only">
								{slot.assignee.name}, {formatWeekdayDate(slot.day)}
							</span>
						</Button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if readOnly}
	{#if slots.length === 0}
		<p class="text-helper text-ink-muted">Nothing booked for this job.</p>
	{/if}
{:else if employees.length === 0 && teams.length === 0}
	<p class="mt-3 text-helper text-ink-muted">
		Nobody to assign yet.
		<a
			href={resolve('/scheduling/people')}
			class="text-ink-secondary underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus-ring focus-visible:outline-solid"
		>
			Add your people
		</a>
		first.
	</p>
{:else}
	<form
		method="POST"
		action="?/schedule"
		use:enhance={booking.enhance}
		class="mt-3 flex flex-wrap items-end gap-3"
	>
		<input type="hidden" name="assignee" value={assignee} />
		<Field label="Who" id="slot-assignee" error={errors.assignee ?? null} class="min-w-48 flex-1">
			{#snippet control(field)}
				<Select type="single" value={assignee} onValueChange={(next) => (assignee = next)}>
					<SelectTrigger
						{...field}
						class="w-full data-[size=default]:h-11 lg:data-[size=default]:h-[38px]"
					>
						{label}
					</SelectTrigger>
					<SelectContent>
						{#if employees.length > 0}
							<SelectGroup>
								<SelectLabel>People</SelectLabel>
								{#each employees as person (person.id)}
									<SelectItem value="employee:{person.id}" label={person.name}>
										{person.name}
									</SelectItem>
								{/each}
							</SelectGroup>
						{/if}
						{#if teams.length > 0}
							<SelectGroup>
								<SelectLabel>Teams</SelectLabel>
								{#each teams as crew (crew.id)}
									<SelectItem value="team:{crew.id}" label={crew.name}>
										{crew.name}
									</SelectItem>
								{/each}
							</SelectGroup>
						{/if}
					</SelectContent>
				</Select>
			{/snippet}
		</Field>
		<Field label="Day" id="slot-day" error={errors.day ?? null} class="w-40">
			{#snippet control(field)}
				<Input {...field} type="date" name="day" />
			{/snippet}
		</Field>
		<Field label="From" id="slot-start" error={errors.start ?? null} class="w-28">
			{#snippet control(field)}
				<Input {...field} type="time" name="start" />
			{/snippet}
		</Field>
		<Field label="To" id="slot-end" error={errors.end ?? null} class="w-28">
			{#snippet control(field)}
				<Input {...field} type="time" name="end" />
			{/snippet}
		</Field>
		<Button type="submit" class="h-11 lg:h-9" pending={booking.pending} pendingLabel="Booking…">
			Put it on the plan
		</Button>
	</form>
{/if}
