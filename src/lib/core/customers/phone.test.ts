import { describe, expect, it } from 'vitest';
import { phoneTail, samePhone } from './phone';

describe('phoneTail', () => {
	it.each([
		['+27 82 123 4567', '821234567'],
		['082 123 4567', '821234567'],
		['0821234567', '821234567'],
		['27821234567', '821234567'],
		['(082) 123-4567', '821234567'],
		['+27 (0)82 123 4567', '821234567'],
		['021 447 2210', '214472210']
	])('reads %s as %s', (input, tail) => {
		expect(phoneTail(input)).toBe(tail);
	});

	it.each([[null], [undefined], [''], ['   '], ['123 4567'], ['ext. 204']])(
		'has no tail for %s, so it matches nothing',
		(input) => {
			expect(phoneTail(input)).toBeNull();
		}
	);
});

describe('samePhone', () => {
	it('treats every way of typing a South African number as the same phone', () => {
		expect(samePhone('+27 82 123 4567', '082 123 4567')).toBe(true);
		expect(samePhone('0821234567', '27 82 123 4567')).toBe(true);
	});

	it('tells different numbers apart', () => {
		expect(samePhone('082 123 4567', '082 123 4568')).toBe(false);
	});

	it('never calls two numbers the same because neither had enough digits', () => {
		expect(samePhone('123', '123')).toBe(false);
		expect(samePhone(null, null)).toBe(false);
	});
});
