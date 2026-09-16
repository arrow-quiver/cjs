/**
 * ROUTE SKELETONS. A skeleton, never a spinner over content: each one mirrors the screen it stands
 * in for, line box for line box, so nothing jumps when the page arrives. See `routes.ts` for which
 * screen gets which, and `skeletons.cls.spec.ts` for how "nothing jumps" is measured.
 */
export { default as RouteSkeleton } from './RouteSkeleton.svelte';
export { NO_SKELETON, ROUTE_SKELETONS, skeletonFor } from './routes';
