<script lang="ts">
	/**
	 * A button that starts work which never finishes, so the pending state can be looked at and
	 * asserted rather than glimpsed. In the product the flag comes from `submission()`. The press
	 * count is what shows a second press while pending did nothing.
	 */
	import { Button } from '$lib/components/ui/button/index.js';

	let pending = $state(false);
	let presses = $state(0);

	function start() {
		presses += 1;
		pending = true;
	}
</script>

<div class="flex items-center gap-3">
	<Button {pending} pendingLabel="Recording…" onclick={start}>Record it</Button>
	<p class="text-helper text-ink-muted" data-testid="presses">Pressed {presses}</p>
</div>
