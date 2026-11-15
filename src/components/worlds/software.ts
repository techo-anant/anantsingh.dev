/**
 * Software world behavior (BUILD_PLAN §7.1, §3.4, §12): the idle → gallery →
 * focus states, driven by the shared worlds store so the particles follow
 * (gallery shape 4, dimmed scatter 5). Escape and leaving the world close
 * the panel (worlds.ts); focus moves with the state.
 */
import { panel, worlds } from './worlds';

/** This world's index (§3.4). */
const WORLD = 0;

export function initSoftware(): void {
  const root = document.querySelector<HTMLElement>('[data-sw]');
  if (!root) return;
  const idle = root.querySelector<HTMLElement>('[data-sw-idle]');
  const gallery = root.querySelector<HTMLElement>('[data-sw-gallery]');
  const panels = [...root.querySelectorAll<HTMLElement>('[data-sw-panel]')];
  const spots = [...root.querySelectorAll<HTMLButtonElement>('[data-sw-focus]')];
  const opener = root.querySelector<HTMLButtonElement>('[data-sw-opener]');
  if (!idle || !gallery) return;

  root.addEventListener('click', (event) => {
    const t = (event.target as Element).closest<HTMLElement>(
      '[data-sw-open], [data-sw-focus], [data-sw-back], [data-sw-close]',
    );
    if (!t) return;
    if (t.hasAttribute('data-sw-open')) panel.openGallery(WORLD);
    else if (t.dataset.swFocus !== undefined)
      panel.focus(WORLD, Number(t.dataset.swFocus) as 0 | 1 | 2);
    else if (t.hasAttribute('data-sw-back')) panel.backGallery();
    else panel.close();
  });

  /** This world's view of the shared panel state. */
  const view = (s: { proj: string; pw: number }) => (s.pw === WORLD ? s.proj : 'idle');

  worlds.subscribe((s, prev) => {
    const now = view(s),
      was = view(prev);
    idle.hidden = now !== 'idle';
    gallery.hidden = now !== 'gallery';
    panels.forEach((p, i) => (p.hidden = !(now === 'focus' && s.fi === i)));

    if (now === was && s.fi === prev.fi) return;
    // Move focus with the state, but never steal it from elsewhere on the page
    // (e.g. after the panel closed because the user scrolled to another world).
    const active = document.activeElement;
    const ours = !active || active === document.body || root.contains(active);
    if (!ours) return;
    if (now === 'gallery') spots[was === 'focus' ? s.fi : 0]?.focus({ preventScroll: true });
    else if (now === 'focus')
      panels[s.fi]?.querySelector<HTMLElement>('[data-sw-back]')?.focus({ preventScroll: true });
    else if (was !== 'idle' && s.active === WORLD) opener?.focus({ preventScroll: true });
  });
}
