/**
 * ONE JOB.
 *
 * `read` is enough to look: a removed module's jobs stay readable. Moving a job needs `write`, and
 * refuses otherwise with the honest 403 `withModule` renders.
 *
 * The commercial sentence is derived here, on this read, from whatever quotes and invoices point at
 * the job, and never stored on it. See `$lib/core/jobs/commercial.ts`.
 *
 * Booking lives here too, because assignment happens on the job card and nowhere else. A clash
 * comes back as a 422 whose sentence names the person and what already has them.
 */
import { error, fail, isHttpError, isRedirect } from '@sveltejs/kit';
import { commercialSentence } from '$lib/core/jobs';
import { notFound } from '$lib/core/refusals';
import { withModule } from '$lib/server/core/ctx';
import { jobCommercialState, loadPipelineJob } from '$lib/server/core/jobs';
import { EmployeeNotFound, TeamNotFound, listEmployees, listTeams } from '$lib/server/core/people';
import {
	JobNotFound,
	ScheduleClash,
	SlotNotFound,
	scheduleJob,
	setJobStatus,
	unscheduleEntry
} from '$lib/server/modules/scheduling/effects';
import { jobSlots } from '$lib/server/modules/scheduling/queries';
import { parseScheduleEntry, parseStatus } from '$lib/server/modules/scheduling/wire';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) =>
	withModule(event, 'scheduling', 'read', async (ctx) => {
		const found = await loadPipelineJob(ctx.tx, event.params.id);
		if (!found) error(404, notFound('job'));

		const readOnly = ctx.access.scheduling !== 'write';

		// Null only when the job cannot be found, and it was found a moment ago in this transaction.
		const [commercial, slots, employees, teams] = await Promise.all([
			jobCommercialState(ctx.tx, ctx.access, found.id),
			jobSlots(ctx.tx, found.id),
			// Only somebody who can book needs the roster.
			readOnly ? Promise.resolve([]) : listEmployees(ctx.tx),
			readOnly ? Promise.resolve([]) : listTeams(ctx.tx)
		]);
		if (!commercial) error(404, notFound('job'));

		return {
			job: found,
			commercial: commercialSentence(commercial),
			slots,
			employees,
			teams,
			readOnly
		};
	});

export const actions: Actions = {
	status: async (event) => {
		const status = parseStatus(await event.request.formData());
		if (!status) return fail(422, { message: 'Choose one of the statuses in the list.' });

		try {
			await withModule(event, 'scheduling', 'write', (ctx) =>
				setJobStatus(ctx.tx, event.params.id, status)
			);
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			if (cause instanceof JobNotFound) error(404, notFound('job'));
			console.error('scheduling: could not change a job status', cause);
			return fail(500, {
				message: 'We could not change that just now. Nothing was saved. Try again.'
			});
		}

		return { saved: true, message: null };
	},

	schedule: async (event) => {
		const parsed = parseScheduleEntry(await event.request.formData());
		if (!parsed.ok) return fail(422, { errors: parsed.errors, message: null });

		try {
			await withModule(event, 'scheduling', 'write', (ctx) =>
				scheduleJob(ctx.tx, ctx.business.id, ctx.userId, event.params.id, parsed.value)
			);
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			if (cause instanceof JobNotFound) error(404, notFound('job'));
			if (cause instanceof ScheduleClash) {
				return fail(422, { errors: { assignee: cause.message }, message: null });
			}
			if (cause instanceof EmployeeNotFound || cause instanceof TeamNotFound) {
				return fail(422, { errors: { assignee: cause.message }, message: null });
			}
			console.error('scheduling: could not book a job', cause);
			return fail(500, {
				errors: {},
				message: 'We could not book that just now. Nothing was saved. Try again.'
			});
		}

		return { saved: true, message: null };
	},

	unschedule: async (event) => {
		const form = await event.request.formData();
		const entryId = form.get('entryId');
		if (typeof entryId !== 'string' || entryId.length === 0) {
			return fail(422, { message: 'Choose the slot to take off the plan.' });
		}

		try {
			await withModule(event, 'scheduling', 'write', (ctx) => unscheduleEntry(ctx.tx, entryId));
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			if (cause instanceof SlotNotFound) {
				return fail(422, { message: cause.message });
			}
			console.error('scheduling: could not remove a slot', cause);
			return fail(500, {
				message: 'We could not remove that just now. Nothing was saved. Try again.'
			});
		}

		return { saved: true, message: null };
	}
};
