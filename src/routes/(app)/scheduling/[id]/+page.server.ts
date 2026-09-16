/**
 * ONE JOB.
 *
 * `read` is enough to look: a removed module's jobs stay readable. Moving a job needs `write`, and
 * refuses otherwise with the honest 403 `withModule` renders.
 *
 * The commercial sentence is derived here, on this read, from whatever quotes and invoices point at
 * the job, and never stored on it. See `$lib/core/jobs/commercial.ts`.
 */
import { error, fail, isHttpError, isRedirect } from '@sveltejs/kit';
import { commercialSentence } from '$lib/core/jobs';
import { notFound } from '$lib/core/refusals';
import { withModule } from '$lib/server/core/ctx';
import { jobCommercialState, loadPipelineJob } from '$lib/server/core/jobs';
import { JobNotFound, setJobStatus } from '$lib/server/modules/scheduling/effects';
import { parseStatus } from '$lib/server/modules/scheduling/wire';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) =>
	withModule(event, 'scheduling', 'read', async (ctx) => {
		const found = await loadPipelineJob(ctx.tx, event.params.id);
		if (!found) error(404, notFound('job'));

		const commercial = await jobCommercialState(ctx.tx, ctx.access, found.id);

		return {
			job: found,
			commercial: commercial ? commercialSentence(commercial) : 'Not tracked here',
			readOnly: ctx.access.scheduling !== 'write'
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
	}
};
