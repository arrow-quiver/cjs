/**
 * WHAT JOBS TELL HOME.
 *
 * Standing: a job nobody has scheduled is the one thing worth raising, because it is work the
 * business has said yes to that is not on anybody's plan. Everything else in the pipeline is
 * somebody's work in hand, and a dashboard that listed it as concerns would be noise.
 *
 * Resume: work under way, so the job somebody was in the middle of is one tap away.
 */
import { addDays, formatMinuteOfDay, todayIn } from '$lib/core/calendar';
import { jobTitle, statusLabel } from '$lib/core/jobs';
import { readiness } from '$lib/server/core/home/readiness';
import type {
	AgendaContribution,
	ModuleSummary,
	ResumeCard,
	StandingPoint,
	SummaryInput
} from '$lib/server/core/home/types';
import { countJobs, jobsUnderWay, unscheduledJobs } from '$lib/server/core/jobs';
import { entriesBetween } from './queries';

const RESUME_LIMIT = 3;

/** Coming up reaches a week out — the same horizon the board plans in. */
const AGENDA_DAYS = 7;

export async function summariseScheduling(input: SummaryInput): Promise<ModuleSummary> {
	const [standing, resume, agenda] = await Promise.all([
		howJobsStand(input),
		underWay(input),
		onThePlan(input)
	]);
	return { standing, resume, figures: [], agenda };
}

/** "Thabo Nkosi on Geyser replacement · 08:00 to 10:00, Fynbos Interiors". */
async function onThePlan(input: SummaryInput): Promise<readonly AgendaContribution[]> {
	const today = todayIn(input.now);
	const entries = await entriesBetween(input.tx, today, addDays(today, AGENDA_DAYS));

	return entries.map((entry) => ({
		id: entry.id,
		// Midday UTC, so the calendar day survives a timezone shift on its way to being
		// formatted — the same transport `quoting/summary.ts` uses.
		on: new Date(`${entry.day}T12:00:00Z`),
		title: `${entry.assignee.name} on ${entry.title}`,
		detail: [
			`${formatMinuteOfDay(entry.startMinute)} to ${formatMinuteOfDay(entry.endMinute)}`,
			entry.customerName
		]
			.filter(Boolean)
			.join(', ')
	}));
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
