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
import {
  currentLayout,
  objectFrame,
  onLayoutChange,
  prefersReducedMotion,
  type Layout,
} from '../../lib/layout';
import { createStore } from '../../lib/store';
import { WORLDS, worldIndex, type WorldId } from '../../lib/worlds';

export interface WorldsState {
  /** Set shortly after mount; gates entrance reveals (§3.4). */
  entered: boolean;
  active: WorldId;
  /** Phone menu open. */
  menu: boolean;
  layout: Layout;
  /** The cover has finished its transition (or was skipped). Set by cover.ts. */
  coverDone: boolean;
  /** Project panel state (§3.4) for the world in `pw`. */
  proj: Proj;
  /** Which world the panel belongs to. */
  pw: WorldId;
  /** Focused item index in the gallery. */
  fi: 0 | 1 | 2;
  /** World ids in page order for this visit (Contact last). Set on init. */
  order: WorldId[];
}

export type Proj = 'idle' | 'gallery' | 'focus';

export const worlds = createStore<WorldsState>({
  entered: false,
  active: 0,
  menu: false,
  layout: 'phone',
  // True unless a cover is on the page; the cover sets it on init.
  coverDone: true,
  proj: 'idle',
  pw: 0,
  fi: 0,
  order: [0, 1, 2, 3, 4],
});

/** Position of world i on the page (0 = first). */
export const positionOf = (i: WorldId, order: readonly WorldId[] = worlds.get().order) =>
  order.indexOf(i);

/** §3.4 panel actions, shared by the world components. */
export const panel = {
  openGallery: (pw: WorldId) => worlds.set({ proj: 'gallery', pw }),
  focus: (pw: WorldId, fi: 0 | 1 | 2) => worlds.set({ proj: 'focus', pw, fi }),
  backGallery: () => worlds.set({ proj: 'gallery' }),
  close: () => worlds.set({ proj: 'idle' }),
};

export function initWorlds(): void {
  const root = document.querySelector<HTMLElement>('[data-worlds]');
  const scroller = root?.querySelector<HTMLElement>('[data-scroller]');
  if (!root || !scroller) return;

  // Sections are already in this visit's order (inline script in Worlds.astro).
  const sections = [...root.querySelectorAll<HTMLElement>('[data-section]')];
  const idOf = (el: HTMLElement) => worldIndex(el.dataset.world ?? '') ?? 0;
  const order = sections.map(idOf);
  const pos = (i: WorldId) => positionOf(i, order);
  const sectionOf = (i: WorldId) => sections[pos(i)];
  worlds.set({ order, active: order[0] });
  const layers = [...root.querySelectorAll<HTMLElement>('[data-layer]')];
  const goLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-go]')];
  const menu = root.querySelector<HTMLElement>('[data-menu]');
  const menuToggle = root.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const footer = root.querySelector<HTMLElement>('[data-footer]');
  const dots = root.querySelector<HTMLElement>('.dots');

  let hashReady = false;

  /** Activate world i. A panel that belongs to another world closes (§3.4). */
  function setActive(i: WorldId) {
    const { proj, pw } = worlds.get();
    worlds.set(proj !== 'idle' && pw !== i ? { active: i, proj: 'idle' } : { active: i });
  }

  /**
   * Object frame as CSS variables on the worlds root (--ox, --oy in px; --k
   * unitless): world UI anchored to the particle object uses these.
   */
  const applyFrame = () => {
    const f = objectFrame(root.clientWidth, root.clientHeight, worlds.get().layout);
    root.style.setProperty('--ox', `${f.ox.toFixed(1)}px`);
    root.style.setProperty('--oy', `${f.oy.toFixed(1)}px`);
    root.style.setProperty('--k', f.k.toFixed(4));
  };

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
    const p = sections.findIndex((s) => s.offsetTop <= mid && mid < s.offsetTop + s.offsetHeight);
    return p >= 0 ? order[p] : undefined;
  }

  function endJump() {
    if (!jumping) return;
    jumping = false;
    window.clearTimeout(jumpTimer);
    // If the user scrolled during the jump, follow where they ended up.
    const i = activeFromScroll();
    if (i !== undefined) setActive(i);
  }

  /**
   * §3.4 go(i, scroll): activate world i, optionally scrolling to it.
   * Neighbours scroll smoothly; longer jumps are instant, and the background
   * reveal grows straight from the old world to the new one.
   */
  function go(i: WorldId, scroll: boolean) {
    const from = worlds.get().active;
    setActive(i);
    const target = sectionOf(i);
    if (!scroll || !target || !scroller) return;

    const smooth = !prefersReducedMotion() && Math.abs(pos(i) - pos(from)) === 1;
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
    root.dataset.pos = String(pos(s.active));
    // Under the cover the worlds run, but are out of reach for keyboard and AT.
    root.inert = !s.coverDone;
    root.toggleAttribute('data-entered', s.entered);

    // Background reveal follows page order: every layer up to the active one.
    layers.forEach((layer) =>
      layer.toggleAttribute('data-revealed', s.entered && pos(idOf(layer)) <= pos(s.active)),
    );
    sections.forEach((sec) => sec.toggleAttribute('data-active', idOf(sec) === s.active));
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
        go(idOf(entry.target as HTMLElement), false);
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
    sectionOf(i)?.focus({ preventScroll: true });
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
    const { menu: menuOpen, active, coverDone } = worlds.get();
    if (!coverDone) return; // the cover handles keys while it is up
    if (event.key === 'Escape') {
      if (menuOpen) setMenu(false);
      else if (worlds.get().proj !== 'idle') panel.close();
      return;
    }
    if (menuOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const target = event.target as Element;
    if (scroller.contains(target)) return;
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === ' ' && target.closest('button')) return;

    // Keys move by page position, not by world id.
    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = order.length - 1;
    else if (event.key in STEP) {
      const step = STEP[event.key] ?? 0;
      next = pos(active) + (event.key === ' ' && event.shiftKey ? -step : step);
    } else return;

    event.preventDefault();
    const i = order[Math.max(0, Math.min(order.length - 1, next))] as WorldId;
    go(i, true);
    focusSection(i);
  });

  window.addEventListener('hashchange', () => {
    const i = worldIndex(location.hash.slice(1));
    if (i !== undefined) go(i, true);
  });

  // ---- Layout ------------------------------------------------------------
  worlds.set({ layout: currentLayout() });
  applyFrame();
  window.addEventListener('resize', applyFrame, { passive: true });
  onLayoutChange((layout) => {
    worlds.set({ layout });
    applyFrame();
    if (layout === 'desktop' && worlds.get().menu) setMenu(false, { restoreFocus: false });
  });

  // ---- Start -------------------------------------------------------------
  // Deep link: /#contact starts on Contact without animating the scroll.
  const start = worldIndex(location.hash.slice(1));
  if (start !== undefined && pos(start) > 0) {
    scroller.scrollTop = sectionOf(start)?.offsetTop ?? 0;
    worlds.set({ active: start });
  }
  hashReady = true;

  // §3.4: entrance reveals start ~60ms after the worlds mount.
  window.setTimeout(() => worlds.set({ entered: true }), 60);
}
