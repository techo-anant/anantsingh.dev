/**
 * Behavior for the focus-only worlds (Robotics, and later Accounting): idle →
 * focus, no gallery (§7.3, §7.4). Uses the shared worlds store, so the
 * particles dim to the scatter shape while the panel is open, and Escape or
 * leaving the world closes it (worlds.ts). Focus moves with the state (§12).
 *
 * Markup contract, inside [data-solo="<world index>"]:
 *   [data-solo-idle]    shown while closed
 *   [data-solo-panel]   shown while open
 *   [data-solo-open]    opens (the hit area and the hint)
 *   [data-solo-opener]  gets focus back on close
 *   [data-solo-close]   closes; the first one in the panel gets focus on open
 */
import type { WorldId } from '../../lib/worlds';
import { panel, worlds } from './worlds';

function initSolo(root: HTMLElement): void {
  const world = Number(root.dataset.solo) as WorldId;
  const idle = root.querySelector<HTMLElement>('[data-solo-idle]');
  const box = root.querySelector<HTMLElement>('[data-solo-panel]');
  const opener = root.querySelector<HTMLElement>('[data-solo-opener]');
  if (!idle || !box) return;

  root.addEventListener('click', (event) => {
    const t = (event.target as Element).closest<HTMLElement>('[data-solo-open], [data-solo-close]');
    if (!t) return;
    if (t.hasAttribute('data-solo-open')) panel.focus(world, 0);
    else panel.close();
  });

  const isOpen = (s: { proj: string; pw: number }) => s.pw === world && s.proj === 'focus';

  worlds.subscribe((s, prev) => {
    const open = isOpen(s),
      was = isOpen(prev);
    idle.hidden = open;
    box.hidden = !open;
    if (open === was) return;
    // Move focus with the state, but never steal it from elsewhere on the page.
    const active = document.activeElement;
    if (active && active !== document.body && !root.contains(active)) return;
    if (open)
      root
        .querySelector<HTMLElement>('[data-solo-panel] [data-solo-close]')
        ?.focus({ preventScroll: true });
    else if (s.active === world) opener?.focus({ preventScroll: true });
  });
}

export function initSolos(): void {
  document.querySelectorAll<HTMLElement>('[data-solo]').forEach(initSolo);
}
