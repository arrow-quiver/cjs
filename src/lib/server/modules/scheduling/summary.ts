/**
 * WHAT JOBS TELL HOME.
 *
 * Standing: a job nobody has scheduled is the one thing worth raising, because it is work the
 * business has said yes to that is not on anybody's plan. Everything else in the pipeline is
 * somebody's work in hand, and a dashboard that listed it as concerns would be noise.
 *
 * Resume: work under way, so the job somebody was in the middle of is one tap away.
 */
import { jobTitle, statusLabel } from '$lib/core/jobs';
import { readiness } from '$lib/server/core/home/readiness';
import type {
	ModuleSummary,
	ResumeCard,
	StandingPoint,
	SummaryInput
} from '$lib/server/core/home/types';
import { countJobs, jobsUnderWay, unscheduledJobs } from '$lib/server/core/jobs';

const RESUME_LIMIT = 3;

export async function summariseScheduling(input: SummaryInput): Promise<ModuleSummary> {
	const [standing, resume] = await Promise.all([howJobsStand(input), underWay(input)]);
	return { standing, resume, figures: [], agenda: [] };
}

async function howJobsStand(input: SummaryInput): Promise<StandingPoint | null> {
	const [counts, unscheduled] = await Promise.all([countJobs(input.tx), unscheduledJobs(input.tx)]);

	if (counts.all === 0) {
		return readiness(input, 'scheduling', {
			statement: 'Jobs are ready when you are',
			nothingYet: 'No jobs yet.'
		});
	}

	if (unscheduled.count > 0) {
		const since = unscheduled.oldest?.toLocaleDateString(input.business.locale, {
			day: 'numeric',
			month: 'long'
		});
		return {
			module: 'scheduling',
			standing: 'attention',
			statement:
				unscheduled.count === 1
					? 'A job is not scheduled'
					: `${unscheduled.count} jobs are not scheduled`,
			explanation: since
				? `The oldest has been waiting since ${since}.`
				: 'Accepted work that is not on anybody’s plan yet.',
			href: '/scheduling?filter=open'
		};
	}

	return {
		module: 'scheduling',
		standing: 'clear',
		statement: counts.open === 0 ? 'No open jobs' : 'Every open job is scheduled',
		explanation:
			counts.open === 0
				? 'Everything is done or cancelled.'
				: `${counts.open} open ${counts.open === 1 ? 'job' : 'jobs'}, all on the plan.`,
		href: '/scheduling'
	};
}

async function underWay(input: SummaryInput): Promise<readonly ResumeCard[]> {
	const jobs = await jobsUnderWay(input.tx, RESUME_LIMIT);
	return jobs.map((j) => ({
		module: 'scheduling',
		id: j.id,
		title: `${jobTitle(j)} for ${j.customerName}`,
		context: `${j.ref} · ${statusLabel(j.status)}`,
		href: `/scheduling/${j.id}`
	}));
}
