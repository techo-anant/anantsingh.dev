/**
 * Tiny observable store (BUILD_PLAN §3.4). `set` merges a partial state and
 * notifies subscribers only when something actually changed.
 */
export interface Store<T extends object> {
  get(): Readonly<T>;
  set(patch: Partial<T>): void;
  /** Calls `fn` now and on every change. Returns an unsubscribe function. */
  subscribe(fn: (state: Readonly<T>, prev: Readonly<T>) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state: T = { ...initial };
  const subs = new Set<(state: Readonly<T>, prev: Readonly<T>) => void>();

  return {
    get: () => state,
    set(patch) {
      const changed = (Object.keys(patch) as (keyof T)[]).some((k) => patch[k] !== state[k]);
      if (!changed) return;
      const prev = state;
      state = { ...state, ...patch };
      subs.forEach((fn) => fn(state, prev));
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state, state);
      return () => subs.delete(fn);
    },
  };
}
