/**
 * THE JOBS LIST, AS THE PIPELINE SCREEN AND HOME READ IT.
 *
 * Every function takes a `Tx` and no business id: `tenant_isolation` has already decided whose jobs
 * these are. Paged and counted rather than capped, because a trade business that has run for a
 * year has hundreds of jobs and a screen that silently stopped at a hundred would be lying about
 * the rest.
 */
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
	JOB_FILTERS,
	statusesFor,
	type JobFilter,
	type JobRow,
	type JobStatus
} from '$lib/core/jobs';
import { customer } from '../db/schema/core';
import { job } from '../db/schema/jobs';
import type { Tx } from '../db/tx';

export const JOBS_PAGE_SIZE = 25;

export type PipelineJob = JobRow;

export type JobPage = {
	readonly items: readonly PipelineJob[];
	readonly total: number;
	readonly page: number;
	readonly pageSize: number;
};

const columns = {
	id: job.id,
	ref: job.numberFormatted,
	status: job.status,
	customerName: customer.name,
	service: job.service,
	area: job.area,
	description: job.description
};

function whereFor(filter: JobFilter) {
	const statuses = statusesFor(filter);
	return statuses
		? and(isNull(job.archivedAt), inArray(job.status, [...statuses]))
		: isNull(job.archivedAt);
}

/** One page of a tab, newest first. The customer is joined on the composite key the jobs table carries. */
export async function pageJobs(
	tx: Tx,
	options: { filter: JobFilter; page: number; pageSize?: number }
): Promise<JobPage> {
	const pageSize = options.pageSize ?? JOBS_PAGE_SIZE;
	const where = whereFor(options.filter);

	// Counted first, so a page past the end is read as the last page rather than as an OFFSET the
	// database has to walk for nothing.
	const [{ total }] = await tx.select({ total: count() }).from(job).where(where);
	// eslint-disable-next-line zones/float-money -- pages, not money
	const lastPage = Math.max(1, Math.ceil(total / pageSize));
	const page = Math.min(Math.max(1, options.page), lastPage);

	const rows = await tx
		.select(columns)
		.from(job)
		.innerJoin(
			customer,
			and(eq(customer.businessId, job.businessId), eq(customer.id, job.customerId))
		)
		.where(where)
		.orderBy(desc(job.createdAt), desc(job.numberValue))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return {
		items: rows.map((row) => ({ ...row, status: row.status as JobStatus })),
		total,
		page,
		pageSize
	};
}

/** How many jobs sit under each tab, in one pass. */
export async function countJobs(tx: Tx): Promise<Readonly<Record<JobFilter, number>>> {
	const rows = await tx
		.select({ status: job.status, n: count() })
		.from(job)
		.where(isNull(job.archivedAt))
		.groupBy(job.status);

	const byStatus = new Map(rows.map((row) => [row.status, row.n]));
	const sum = (statuses: readonly JobStatus[] | null) =>
		(statuses ?? [...byStatus.keys()]).reduce((total, s) => total + (byStatus.get(s) ?? 0), 0);

	return Object.fromEntries(JOB_FILTERS.map((f) => [f, sum(statusesFor(f))])) as Record<
		JobFilter,
		number
	>;
}

/** One job with its client's name, or null when it is not this business's or is archived. */
export async function loadPipelineJob(tx: Tx, jobId: string): Promise<PipelineJob | null> {
	const [row] = await tx
		.select(columns)
		.from(job)
		.innerJoin(
			customer,
			and(eq(customer.businessId, job.businessId), eq(customer.id, job.customerId))
		)
		.where(and(eq(job.id, jobId), isNull(job.archivedAt)))
		.limit(1);
	return row ? { ...row, status: row.status as JobStatus } : null;
}

/** Jobs nobody has scheduled yet: how many, and when the oldest came in. */
export async function unscheduledJobs(
	tx: Tx
): Promise<{ readonly count: number; readonly oldest: Date | null }> {
	const [row] = await tx
		.select({ count: count(), oldest: sql<string | null>`min(${job.createdAt})` })
		.from(job)
		.where(and(isNull(job.archivedAt), eq(job.status, 'unscheduled')));
	return { count: row?.count ?? 0, oldest: row?.oldest ? new Date(row.oldest) : null };
}

/** Work under way, the longest-running first, for Home's "pick up where you left off". */
export async function jobsUnderWay(tx: Tx, limit: number): Promise<readonly PipelineJob[]> {
	const rows = await tx
		.select(columns)
		.from(job)
		.innerJoin(
			customer,
			and(eq(customer.businessId, job.businessId), eq(customer.id, job.customerId))
		)
		.where(and(isNull(job.archivedAt), eq(job.status, 'in_progress')))
		.orderBy(asc(job.updatedAt))
		.limit(limit);
	return rows.map((row) => ({ ...row, status: row.status as JobStatus }));
}
