/**
 * THE CLIENT PICKER ON A PHONE.
 *
 * It is the first control a new business has to tap, on a quote written standing in somebody's
 * kitchen, so its targets carry the design's 44px floor. Measured in a real Chromium at 390 × 844:
 * a class that says `h-11` proves nothing if a parent squeezes the row.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { mount, unmount } from 'svelte';
import '../../../routes/layout.css';
import type { CreateCustomer } from './request';
import CustomerField from './CustomerField.svelte';

const TOUCH_MINIMUM = 44;
const PHONE_WIDTH = 390;

let target: HTMLElement | null = null;
let instance: Record<string, unknown> | null = null;

afterEach(() => {
	if (instance) unmount(instance);
	target?.remove();
	instance = null;
	target = null;
});

function render(create: CreateCustomer): HTMLElement {
	target = document.createElement('div');
	target.style.width = `${PHONE_WIDTH - 32}px`;
	document.body.style.margin = '0';
	document.body.append(target);
	instance = mount(CustomerField, {
		target,
		props: {
			id: 'phone-client',
			customers: [{ id: 'c-1', name: 'Fynbos Interiors' }],
			value: null,
			create,
			onchoose: () => {}
		}
	}) as Record<string, unknown>;
	return target;
}

const heightOf = (element: Element) => element.getBoundingClientRect().height;

describe('the client picker on a phone', () => {
	it('gives "New client" a full touch target beside the select', async () => {
		const field = render(async () => ({ kind: 'failed', message: 'unused' }));
		const button = [...field.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('New client')
		);

		expect(button).toBeDefined();
		expect(heightOf(button!)).toBeGreaterThanOrEqual(TOUCH_MINIMUM);

		const trigger = field.querySelector('[data-slot="select-trigger"]');
		expect(trigger).not.toBeNull();
		expect(heightOf(trigger!)).toBeGreaterThanOrEqual(TOUCH_MINIMUM);
	});

	it('gives "Use" on a likely duplicate a full touch target', async () => {
		const field = render(async () => ({
			kind: 'duplicate',
			matches: [{ id: 'c-1', name: 'Fynbos Interiors', phone: '+27 82 123 4567' }]
		}));
		const open = [...field.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('New client')
		)!;
		await userEvent.click(open);

		await expect.poll(() => document.getElementById('new-client-name')).toBeTruthy();
		await userEvent.type(document.getElementById('new-client-name')!, 'Fynbos (Stellenbosch)');
		const add = [...document.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Add client')
		)!;
		await userEvent.click(add);

		await expect
			.poll(() =>
				[...document.querySelectorAll('button')].find((b) =>
					b.textContent?.includes('Use Fynbos Interiors')
				)
			)
			.toBeTruthy();
		const use = [...document.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Use Fynbos Interiors')
		)!;
		expect(heightOf(use)).toBeGreaterThanOrEqual(TOUCH_MINIMUM);

		await userEvent.keyboard('{Escape}');
	});
});
