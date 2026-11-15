/**
 * Worlds shell behavior (BUILD_PLAN §3.2, §3.4, §6).
 *
 * - The active world is whichever section crosses the middle of the
 *   scroller. This matches the reference's "55% visible" rule for
 *   full-height sections and keeps working when a section is taller than the
 *   screen (short phones, big zoom).
 * - Nav links, side dots and menu items are #hash links: with JS they
 *   smooth-scroll; without JS the browser jumps natively.
 * - The URL hash follows the active world via history.replaceState (no new
 *   history entries). Visiting /#contact starts on Contact.
 * - The DOM reflects state through attributes; CSS does the styling.
 */
import { currentLayout, onLayoutChange, prefersReducedMotion, type Layout } from '../../lib/layout';
import { createStore } from '../../lib/store';
import { WORLDS, worldIndex, type WorldId } from '../../lib/worlds';

export interface WorldsState {
  /** Set shortly after mount; gates entrance reveals (§3.4). */
  entered: boolean;
  active: WorldId;
  /** Phone menu open. */
  menu: boolean;
  layout: Layout;
}

export const worlds = createStore<WorldsState>({
  entered: false,
  active: 0,
  menu: false,
  layout: 'phone',
});

export function initWorlds(): void {
  const root = document.querySelector<HTMLElement>('[data-worlds]');
  const scroller = root?.querySelector<HTMLElement>('[data-scroller]');
  if (!root || !scroller) return;

  const sections = [...root.querySelectorAll<HTMLElement>('[data-section]')];
  const layers = [...root.querySelectorAll<HTMLElement>('[data-layer]')];
  const goLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-go]')];
  const menu = root.querySelector<HTMLElement>('[data-menu]');
  const menuToggle = root.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const footer = root.querySelector<HTMLElement>('[data-footer]');
  const dots = root.querySelector<HTMLElement>('.dots');

  let hashReady = false;

  /**
   * While a navigation scroll is in flight, the worlds it passes over must not
   * become active (Software → Accounting should not flash AI and Robotics).
   * Scroll sync is paused until the scroll settles.
   */
  let jumping = false;
  let jumpTimer = 0;

  /** The section crossing the middle of the scroller. */
  function activeFromScroll(): WorldId | undefined {
    if (!scroller) return undefined;
    const mid = scroller.scrollTop + scroller.clientHeight / 2;
    const i = sections.findIndex((s) => s.offsetTop <= mid && mid < s.offsetTop + s.offsetHeight);
    return i >= 0 ? (i as WorldId) : undefined;
  }

  function endJump() {
    if (!jumping) return;
    jumping = false;
    window.clearTimeout(jumpTimer);
    // If the user scrolled during the jump, follow where they ended up.
    const i = activeFromScroll();
    if (i !== undefined) worlds.set({ active: i });
  }

  /**
   * §3.4 go(i, scroll): activate world i, optionally scrolling to it.
   * Neighbours scroll smoothly; longer jumps are instant, and the background
   * reveal grows straight from the old world to the new one.
   */
  function go(i: WorldId, scroll: boolean) {
    const from = worlds.get().active;
    worlds.set({ active: i });
    const target = sections[i];
    if (!scroll || !target || !scroller) return;

    const smooth = !prefersReducedMotion() && Math.abs(i - from) === 1;
    jumping = true;
    window.clearTimeout(jumpTimer);
    // Fallback in case 'scrollend' never fires (already in place, old browser).
    jumpTimer = window.setTimeout(endJump, smooth ? 1500 : 200);
    scroller.scrollTo({ top: target.offsetTop, behavior: smooth ? 'smooth' : 'auto' });
  }

  function setMenu(open: boolean, { restoreFocus = true } = {}) {
    worlds.set({ menu: open });
    if (!open && restoreFocus) menuToggle?.focus();
  }

  // ---- State → DOM -------------------------------------------------------
  worlds.subscribe((s, prev) => {
    const world = WORLDS[s.active];
    root.dataset.world = world.id;
    root.toggleAttribute('data-entered', s.entered);

    layers.forEach((layer, k) =>
      layer.toggleAttribute('data-revealed', s.entered && k <= s.active),
    );
    sections.forEach((sec, k) => sec.toggleAttribute('data-active', k === s.active));
    goLinks.forEach((a) => {
      if (Number(a.dataset.go) === s.active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    if (menu && menuToggle) {
      menu.hidden = !s.menu;
      menuToggle.setAttribute('aria-expanded', String(s.menu));
      menuToggle.textContent = s.menu ? 'close' : 'menu';
      // While the menu covers the page, take the rest out of focus order.
      for (const el of [scroller, footer, dots]) el?.toggleAttribute('inert', s.menu);
      if (s.menu && !prev.menu) {
        menu.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
      }
    }

    if (hashReady && s.active !== prev.active) {
      const hash = `#${world.id}`;
      if (location.hash !== hash) history.replaceState(history.state, '', hash);
    }
  });

  // ---- Scroll sync (§6.4) ------------------------------------------------
  const io = new IntersectionObserver(
    (entries) => {
      if (jumping) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const i = sections.indexOf(entry.target as HTMLElement);
        if (i >= 0) go(i as WorldId, false);
      }
    },
    // A zero-height band across the middle of the scroller.
    { root: scroller, rootMargin: '-50% 0px -50% 0px', threshold: 0 },
  );
  sections.forEach((s) => io.observe(s));
  scroller.addEventListener('scrollend', endJump);

  /**
   * Move focus into the world we navigated to: screen readers announce it,
   * and PageDown / arrow keys then scroll the scroller (focus on a header
   * link would leave them with nothing to scroll).
   */
  function focusSection(i: WorldId) {
    sections[i]?.focus({ preventScroll: true });
  }

  // ---- Navigation --------------------------------------------------------
  root.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-go]');
    if (!link) return;
    event.preventDefault();
    const i = Number(link.dataset.go) as WorldId;
    if (link.closest('[data-menu]')) setMenu(false, { restoreFocus: false });
    go(i, true);
    focusSection(i);
  });

  menuToggle?.addEventListener('click', () => setMenu(!worlds.get().menu));

  // Keys that page through the worlds when focus is outside the scroller
  // (on load, or on a header control). Inside it, native scrolling + snap.
  const STEP: Record<string, number> = {
    PageDown: 1,
    ArrowDown: 1,
    ' ': 1,
    PageUp: -1,
    ArrowUp: -1,
  };

  document.addEventListener('keydown', (event) => {
    const { menu: menuOpen, active } = worlds.get();
    if (event.key === 'Escape') {
      if (menuOpen) setMenu(false);
      return;
    }
    if (menuOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const target = event.target as Element;
    if (scroller.contains(target)) return;
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === ' ' && target.closest('button')) return;

    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = WORLDS.length - 1;
    else if (event.key in STEP) {
      const step = STEP[event.key] ?? 0;
      next = active + (event.key === ' ' && event.shiftKey ? -step : step);
    } else return;

    event.preventDefault();
    const i = Math.max(0, Math.min(WORLDS.length - 1, next)) as WorldId;
    go(i, true);
    focusSection(i);
  });

  window.addEventListener('hashchange', () => {
    const i = worldIndex(location.hash.slice(1));
    if (i !== undefined) go(i, true);
  });

  // ---- Layout ------------------------------------------------------------
  worlds.set({ layout: currentLayout() });
  onLayoutChange((layout) => {
    worlds.set({ layout });
    if (layout === 'desktop' && worlds.get().menu) setMenu(false, { restoreFocus: false });
  });

  // ---- Start -------------------------------------------------------------
  // Deep link: /#contact starts on Contact without animating the scroll.
  const start = worldIndex(location.hash.slice(1));
  if (start !== undefined && start > 0) {
    scroller.scrollTop = sections[start]?.offsetTop ?? 0;
    worlds.set({ active: start });
  }
  hashReady = true;

  // §3.4: entrance reveals start ~60ms after the worlds mount.
  window.setTimeout(() => worlds.set({ entered: true }), 60);
}
