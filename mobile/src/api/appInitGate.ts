/**
 * Publishes the running /app-init request so other queries can wait on the data
 * it will deliver instead of pulling their own copy of the same payload. Lives
 * apart from appInit.ts so its consumers don't have to import each other in a
 * cycle.
 *
 * The gate covers only the /app-init call itself, never the fallback prefetches
 * that follow a failure: a waiter has to be free to fetch on its own the moment
 * the request settles, otherwise a fallback prefetch that dedupes onto that
 * waiter would deadlock against it.
 */
let gate: Promise<void> | null = null;

export function setAppInitGate(pending: Promise<void> | null) {
  gate = pending;
}

/** The in-flight /app-init call, or null when none is running. */
export function appInitGate(): Promise<void> | null {
  return gate;
}
