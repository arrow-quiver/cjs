/**
 * THE TWO THINGS A PERSON DOES TO A JOB HERE: start one, and move it on.
 *
 * Both run inside the caller's tenant transaction. Neither touches money, and nothing here is
 * called by anything that does: a job's status changes only because somebody pressed a button.
 */
import { and, eq, isNull } from 'drizzle-orm';
import type { Job, JobStatus } from '$lib/core/jobs';
import { ClientNotFound } from '$lib/server/core/customers';
import { createJob } from '$lib/server/core/jobs';
import { customer } from '$lib/server/core/db/schema/core';
import { job } from '$lib/server/core/db/schema/jobs';
import type { Tx } from '$lib/server/core/db/tx';
import type { NewJob } from './wire';

/** The job is not this business's, or has been archived. Said the same way as any not-found. */
export class JobNotFound extends Error {
	constructor() {
		super("We couldn't find that job.");
		this.name = 'JobNotFound';
	}
}

/**
 * Start a job for a client, by hand. The client is looked up in THIS transaction first: row
 * security returns nothing for another business's id, and that is refused as a sentence before the
 * composite key would refuse it as a constraint error.
 */
export async function startJob(
	tx: Tx,
	businessId: string,
	userId: string,
	input: NewJob
): Promise<Job> {
	const [client] = await tx
		.select({ id: customer.id })
		.from(customer)
		.where(eq(customer.id, input.customerId))
		.limit(1);
	if (!client) throw new ClientNotFound();

	return createJob(tx, {
		businessId,
		customerId: client.id,
		service: input.service,
		area: input.area,
		description: input.description,
		startedByUserId: userId
	});
}

/** Move a job to any status. There is no transition table; see `$lib/core/jobs/pipeline.ts`. */
export async function setJobStatus(tx: Tx, jobId: string, status: JobStatus): Promise<void> {
	const updated = await tx
		.update(job)
		.set({ status })
		.where(and(eq(job.id, jobId), isNull(job.archivedAt)))
		.returning({ id: job.id });
	if (updated.length === 0) throw new JobNotFound();
}
