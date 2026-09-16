/**
 * EVERY INPUT IS ACKNOWLEDGED INSIDE 400MS.
 *
 * The failure this prevents is a person pressing a button twice because nothing happened. The
 * work itself can take as long as it takes; what cannot wait is the sign that it started. So the
 * acknowledgement is a state change that happens on the press, not a completion that happens when
 * the server answers.
 *
 * Every progressively enhanced form goes through one of the two functions below, which is what
 * lets `acknowledgement.test.ts` hold the whole product to the rule by reading source rather than
 * by trusting each screen to remember:
 *
 * - `submission()` is for a form whose own button should say it is working. It hands back a
 *   `pending` flag for that button (`<Button pending>`) as well as the enhance function.
 * - `acknowledged()` is for a form with no button of its own to change, such as a hidden form
 *   submitted from somewhere else.
 *
 * Both also raise `activity.busy` for as long as the request is in flight, and the app shell
 * draws that as its activity bar. So a form nobody gave a pending state is still acknowledged.
 *
 * THE COUNT LIVES AT MODULE SCOPE, and that is safe here only because nothing on the server ever
 * changes it: it moves inside submit handlers, which run in the browser. Server rendering reads
 * the initial zero.
 */
import type { SubmitFunction } from '@sveltejs/kit';

let inflight = $state(0);

/** Whether any enhanced form is waiting on the server right now. */
export const activity = {
	get busy(): boolean {
		return inflight > 0;
	}
};

type Payload = Record<string, unknown> | undefined;

/**
 * Wraps a SvelteKit `enhance` submit function so the request raises `activity.busy` until it
 * settles, however it settles: answered, cancelled before it was sent, or thrown.
 *
 * With no function, it behaves exactly like a bare `use:enhance`, which updates the page with
 * the result.
 */
export function acknowledged<
	Success extends Payload = Record<string, unknown>,
	Failure extends Payload = Record<string, unknown>
>(
	submit?: SubmitFunction<Success, Failure>,
	onsettle?: () => void
): SubmitFunction<Success, Failure> {
	return async (input) => {
		inflight += 1;
		let open = true;
		const settle = () => {
			if (!open) return;
			open = false;
			inflight -= 1;
			onsettle?.();
		};

		// A submit function may cancel the request before it is sent. SvelteKit then never calls
		// the callback below, so the cancel itself has to be what settles.
		const cancel = () => {
			settle();
			input.cancel();
		};

		let after: Awaited<ReturnType<SubmitFunction<Success, Failure>>>;
		try {
			after = await submit?.({ ...input, cancel });
		} catch (error) {
			settle();
			throw error;
		}

		return async (outcome) => {
			try {
				if (typeof after === 'function') await after(outcome);
				else await outcome.update();
			} finally {
				settle();
			}
		};
	};
}

/**
 * Raises `activity.busy` until `work` settles, for a request that is not a form: a `fetch` a
 * component makes on a press, where nothing else on screen says the press was taken.
 */
export async function tracked<T>(work: Promise<T>): Promise<T> {
	inflight += 1;
	try {
		return await work;
	} finally {
		inflight -= 1;
	}
}

/** A form whose own button acknowledges it. */
export type Submission<Success extends Payload, Failure extends Payload> = {
	/** True from the press until the server has answered and the page has updated. */
	readonly pending: boolean;
	/** Pass to `use:enhance`. */
	readonly enhance: SubmitFunction<Success, Failure>;
};

/**
 * `acknowledged()`, plus a `pending` flag scoped to this one form, for the button that submitted
 * it. Create it in a component's script, once per form.
 */
export function submission<
	Success extends Payload = Record<string, unknown>,
	Failure extends Payload = Record<string, unknown>
>(submit?: SubmitFunction<Success, Failure>): Submission<Success, Failure> {
	let pending = $state(false);

	const enhance = acknowledged<Success, Failure>(
		async (input) => {
			pending = true;
			return submit?.(input);
		},
		() => {
			pending = false;
		}
	);

	return {
		get pending() {
			return pending;
		},
		enhance
	};
}
