/**
 * Behavior for every <Gallery> (Software, AI): idle → gallery → focus, driven
 * by the shared worlds store so the particles follow (gallery shape 4 or 6,
 * dimmed scatter 5). Escape and leaving the world close the panel
 * (worlds.ts); focus moves with the state (§12).
 */
import type { WorldId } from '../../lib/worlds';
import { panel, worlds } from './worlds';

function initGallery(root: HTMLElement): void {
  const world = Number(root.dataset.gal) as WorldId;
  const idle = root.querySelector<HTMLElement>('[data-gal-idle]');
  const gallery = root.querySelector<HTMLElement>('[data-gal-gallery]');
  const panels = [...root.querySelectorAll<HTMLElement>('[data-gal-panel]')];
  const spots = [...root.querySelectorAll<HTMLButtonElement>('[data-gal-focus]')];
  const opener = root.querySelector<HTMLButtonElement>('[data-gal-opener]');
  if (!idle || !gallery) return;

  root.addEventListener('click', (event) => {
    const t = (event.target as Element).closest<HTMLElement>(
      '[data-gal-open], [data-gal-focus], [data-gal-back], [data-gal-close]',
    );
    if (!t) return;
    if (t.hasAttribute('data-gal-open')) panel.openGallery(world);
    else if (t.dataset.galFocus !== undefined)
      panel.focus(world, Number(t.dataset.galFocus) as 0 | 1 | 2);
    else if (t.hasAttribute('data-gal-back')) panel.backGallery();
    else panel.close();
  });

  /** This world's view of the shared panel state. */
  const view = (s: { proj: string; pw: number }) => (s.pw === world ? s.proj : 'idle');

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
      panels[s.fi]?.querySelector<HTMLElement>('[data-gal-back]')?.focus({ preventScroll: true });
    else if (was !== 'idle' && s.active === world) opener?.focus({ preventScroll: true });
  });
}

export function initGalleries(): void {
  document.querySelectorAll<HTMLElement>('[data-gal]').forEach(initGallery);
}
