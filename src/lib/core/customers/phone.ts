/**
 * THE SAME PHONE NUMBER, HOWEVER IT WAS TYPED.
 *
 * A South African number arrives as `+27 82 123 4567`, `082 123 4567`, `0821234567`,
 * `27821234567` or with brackets and dashes, and every one of those is the same phone. The legacy
 * suite matched on the last nine digits, which is the subscriber number with the country code or
 * the trunk `0` stripped, and that is what this does.
 *
 * It is for NOTICING a likely duplicate, not for validating a number. Anything with fewer than
 * nine digits has no tail to compare and matches nothing, rather than matching everything short.
 */

/** Digits a number must have before its tail means anything. */
export const PHONE_TAIL_LENGTH = 9;

/** The last nine digits of a phone number, or null when there are not nine to take. */
export function phoneTail(input: string | null | undefined): string | null {
	if (!input) return null;
	const digits = input.replace(/\D/g, '');
	return digits.length < PHONE_TAIL_LENGTH ? null : digits.slice(-PHONE_TAIL_LENGTH);
}

/** Whether two numbers are, as far as a person would be concerned, the same phone. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
	const left = phoneTail(a);
	return left !== null && left === phoneTail(b);
}
