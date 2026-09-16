<script lang="ts">
	/**
	 * A button that starts work which never finishes, so the pending state can be looked at and
	 * asserted rather than glimpsed. In the product the flag comes from `submission()`.
	 */
	import { Button } from '$lib/components/ui/button/index.js';

	let pending = $state(false);
</script>

<Button {pending} pendingLabel="Recording…" onclick={() => (pending = true)}>Record it</Button>
