/**
 * JOB SCHEDULING: THE PIPELINE.
 *
 * Three states of access, as every module has: locked (never owned), removed (still readable,
 * nothing that writes), and owned. The screen is the list of jobs by tab, and starting a job by hand.
 */
import { fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { isJobFilter, type JobFilter } from '$lib/core/jobs';
import { moduleAccess, withBusiness, withModule } from '$lib/server/core/ctx';
import { ClientNotFound, listCustomers } from '$lib/server/core/customers';
import { JOBS_PAGE_SIZE, countJobs, pageJobs } from '$lib/server/core/jobs';
import { carryoverSummary, loadCarryover } from '$lib/server/core/modules/carryover';
import { moduleRow, modulePrice } from '$lib/server/core/modules/catalogue';
import { startJob } from '$lib/server/modules/scheduling/effects';
import { parseNewJob } from '$lib/server/modules/scheduling/wire';
import type { Actions, PageServerLoad } from './$types';

function readFilter(url: URL): JobFilter {
	const value = url.searchParams.get('filter');
	return isJobFilter(value) ? value : 'open';
}

function readPage(url: URL): number {
	const value = Number(url.searchParams.get('page') ?? '1');
	return Number.isInteger(value) && value > 0 ? value : 1;
}

const NO_COUNTS: Readonly<Record<JobFilter, number>> = { open: 0, done: 0, cancelled: 0, all: 0 };

export const load: PageServerLoad = async (event) => {
	const access = moduleAccess(event, 'scheduling');
	const row = moduleRow('scheduling');
	const module = {
		key: row.key,
		label: row.label,
		description: row.description,
		accent: row.accent
	};

	if (access === 'none') {
		const carryover = await withBusiness(event, async (ctx) =>
			carryoverSummary(await loadCarryover(ctx.tx, ctx.business, ctx.access))
		);
		return {
			access,
			module,
			price: modulePrice('scheduling'),
			carryover,
			filter: 'open' as JobFilter,
			jobs: [],
			counts: NO_COUNTS,
			page: 1,
			pageCount: 1,
			customers: []
		};
	}

	const filter = readFilter(event.url);
	const page = readPage(event.url);

	return withModule(event, 'scheduling', 'read', async (ctx) => {
		const [result, counts, customers] = await Promise.all([
			pageJobs(ctx.tx, { filter, page }),
			countJobs(ctx.tx),
			// Only a business that can start a job needs the address book.
			access === 'write' ? listCustomers(ctx.tx) : Promise.resolve([])
		]);

		return {
			access,
			module,
			price: modulePrice('scheduling'),
			carryover: null,
			filter,
			jobs: result.items,
			counts,
			page: result.page,
			// eslint-disable-next-line zones/float-money -- pages, not money
			pageCount: Math.max(1, Math.ceil(result.total / JOBS_PAGE_SIZE)),
			customers
		};
	});
};

export const actions: Actions = {
	create: async (event) => {
		const parsed = parseNewJob(await event.request.formData());
		if (!parsed.ok) return fail(422, { errors: parsed.errors, message: null });

		let id: string;
		try {
			id = await withModule(event, 'scheduling', 'write', async (ctx) => {
				const job = await startJob(ctx.tx, ctx.business.id, ctx.userId, parsed.value);
				return job.id;
			});
		} catch (cause) {
			if (isHttpError(cause) || isRedirect(cause)) throw cause;
			if (cause instanceof ClientNotFound) {
				return fail(422, { errors: { customerId: cause.message }, message: null });
			}
			console.error('scheduling: could not start a job', cause);
			return fail(500, {
				errors: {},
				message: 'We could not start that job just now. Nothing was saved. Try again.'
			});
		}

		redirect(303, `/scheduling/${id}`);
	}
};
