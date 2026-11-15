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

/**
 * Where the particle object sits (BUILD_PLAN §4.3), shared by the particle
 * engine and the world UI so rings, hints and hotspots line up with the dots.
 *   ox, oy  object center in px
 *   scale   object scale in px (the engine's projection scale)
 *   k       scale relative to the reference artboard (desktop 211.5 px at
 *           1440×900, phone 97.5 px at 390×844): multiply artboard px by k
 */
export interface ObjectFrame {
  ox: number;
  oy: number;
  scale: number;
  k: number;
}

export function objectFrame(W: number, H: number, layout: Layout): ObjectFrame {
  if (layout === 'phone') {
    // Width-based (§4.3), but never taller than the reference proportion allows,
    // so short phones (e.g. 375×667) keep the title, object and roles apart.
    // At the reference 390×844 both terms are equal.
    const scale = Math.min(W * 0.25, H * (97.5 / 844));
    return { ox: W * 0.5, oy: H * 0.417, scale, k: scale / 97.5 };
  }
  const scale = Math.min(W, H) * 0.235;
  return { ox: W * 0.71, oy: H * 0.48, scale, k: scale / 211.5 };
}
