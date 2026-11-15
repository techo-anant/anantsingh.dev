/**
 * Desktop vs phone layout (BUILD_PLAN §4.1). The min-height keeps landscape
 * phones on the phone layout.
 * Keep in sync with the media queries in src/styles/tokens.css and global.css.
 */
export const DESKTOP_QUERY =
  '(min-width: 820px) and (orientation: landscape) and (min-height: 600px)';

export type Layout = 'desktop' | 'phone';

const mql = () => window.matchMedia(DESKTOP_QUERY);

export const currentLayout = (): Layout => (mql().matches ? 'desktop' : 'phone');

/** Calls `fn` whenever the layout switches. Returns an unsubscribe function. */
export function onLayoutChange(fn: (layout: Layout) => void): () => void {
  const m = mql();
  const handler = () => fn(m.matches ? 'desktop' : 'phone');
  m.addEventListener('change', handler);
  return () => m.removeEventListener('change', handler);
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
