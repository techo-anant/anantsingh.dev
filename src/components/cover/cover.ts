/**
 * The cover and its page-turn transition (BUILD_PLAN §5).
 *
 * Forward (§5.4): measure "Anant", zoom into it (1.45 s), then three ink
 * splashes land from e = 1.6 s and a bleed dissolves the rest; the result is
 * applied as a mask on the cover so the live worlds show through. When the
 * bleed completes the cover is hidden and its loop stops.
 *
 * Reverse (§5.5): the header name runs ink time backwards from 5.5 s at 1.7×;
 * below 1.62 s the mask clears and the zoom eases back out.
 *
 * Reduced motion (§5.6): no zoom, the mask jumps to its end state; reverse is
 * instant. Deep links (/#contact) skip the cover entirely (§3.2).
 */
import { currentLayout, prefersReducedMotion } from '../../lib/layout';
import { WORLDS, worldIndex } from '../../lib/worlds';
import { worlds } from '../worlds/worlds';
import { chunkFragments, Handwriting } from './handwriting';
import { InkMask, makeSplashes, type Splash } from './ink';

type Phase = 'idle' | 'leaving' | 'done' | 'returning';

interface Zoom {
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  S: number;
}

const ZOOM_IN = 'transform 1.45s cubic-bezier(.7,0,.2,1)';
const ZOOM_OUT = 'transform 1.3s cubic-bezier(.5,0,.2,1)';

/** The cover's elements, or null if any is missing. */
function findElements() {
  const cover = document.querySelector<HTMLElement>('[data-cover]');
  const maskEl = cover?.querySelector<HTMLElement>('[data-cover-mask]');
  const zoomEl = cover?.querySelector<HTMLElement>('[data-cover-zoom]');
  const canvas = cover?.querySelector<HTMLCanvasElement>('[data-cover-canvas]');
  const anant = cover?.querySelector<HTMLElement>('[data-anant]');
  const go = cover?.querySelector<HTMLButtonElement>('[data-cover-go]');
  if (!cover || !maskEl || !zoomEl || !canvas || !anant || !go) return null;
  return { cover, maskEl, zoomEl, canvas, anant, go };
}

export function initCover(): void {
  const els = findElements();
  if (!els) return;
  const { cover, maskEl, zoomEl, canvas, anant, go } = els;

  const reduced = prefersReducedMotion();
  const phone = () => currentLayout() === 'phone';
  const frags = JSON.parse(cover.dataset.fragments ?? '[]') as string[];
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() || 'cursive';
  const hand = new Handwriting(
    canvas,
    { desktop: frags, phone: chunkFragments(frags) },
    family,
    reduced,
  );
  const ink = new InkMask();

  let phase: Phase = 'idle';
  let leaveAt = 0;
  let backAt = 0;
  let splashes: Splash[] = [];
  let raf = 0;
  /** Mask updates are expensive; on slow devices, update every other frame. */
  let stride = 1;
  let frame = 0;

  // ---- Zoom (§5.4 steps 1 and 2) ----------------------------------------
  function measure(): Zoom {
    const rr = cover.getBoundingClientRect();
    const ar = anant.getBoundingClientRect();
    const W = cover.clientWidth,
      H = cover.clientHeight;
    const ox = ar.left - rr.left + ar.width / 2,
      oy = ar.top - rr.top + ar.height / 2;
    return { ox, oy, S: (W * 0.94) / ar.width, tx: W / 2 - ox, ty: H / 2 - oy };
  }

  function setZoom(z: Zoom | null, transition: string) {
    zoomEl.style.transition = transition;
    if (!z) {
      zoomEl.style.transform = 'none';
      return;
    }
    zoomEl.style.transformOrigin = `${z.ox.toFixed(2)}px ${z.oy.toFixed(2)}px`;
    zoomEl.style.transform = `translate(${z.tx.toFixed(2)}px, ${z.ty.toFixed(2)}px) scale(${z.S.toFixed(3)})`;
  }

  // ---- Mask --------------------------------------------------------------
  function setMask(image: string) {
    maskEl.style.setProperty('mask-image', image);
    // Older Safari only reads the prefixed properties.
    maskEl.style.setProperty('-webkit-mask-image', image);
    maskEl.style.setProperty('-webkit-mask-size', '100% 100%');
    maskEl.style.setProperty('-webkit-mask-repeat', 'no-repeat');
  }

  function renderMask(e: number, force = false): boolean {
    frame++;
    if (!force && stride > 1 && frame % stride) return false;
    const t0 = performance.now();
    const m = ink.render(e, cover.clientWidth, cover.clientHeight, splashes, {
      phone: phone(),
      reduced,
    });
    if (performance.now() - t0 > 14) stride = 2;
    setMask(m.image);
    return m.complete;
  }

  // ---- Loop --------------------------------------------------------------
  function tick(ms: number) {
    const t = ms / 1000;
    hand.draw(t, { spawn: phase === 'idle', phone: phone() });

    if (phase === 'leaving') {
      if (renderMask(t - leaveAt)) return finish();
    } else if (phase === 'returning') {
      const e = reduced ? 0.2 - (t - backAt) * 1.7 : 5.5 - (t - backAt) * 1.7;
      if (e < (reduced ? 0.1 : 1.62)) {
        setMask('');
        setZoom(null, reduced ? 'none' : ZOOM_OUT);
        phase = 'idle';
      } else {
        renderMask(e, true);
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  // ---- Forward -----------------------------------------------------------
  function next() {
    if (phase !== 'idle') return;
    phase = 'leaving';
    leaveAt = performance.now() / 1000;
    splashes = makeSplashes(cover.clientWidth, cover.clientHeight, phone());
    if (!reduced) setZoom(measure(), ZOOM_IN);
  }

  function finish() {
    phase = 'done';
    cancelAnimationFrame(raf);
    cover.toggleAttribute('data-done', true);
    worlds.set({ coverDone: true });
    // Now that the worlds are visible, put focus and the URL there.
    const { active } = worlds.get();
    document
      .querySelector<HTMLElement>('[data-section][data-active]')
      ?.focus({ preventScroll: true });
    if (active > 0) history.replaceState(history.state, '', `#${WORLDS[active].id}`);
  }

  // ---- Reverse (§5.5) ----------------------------------------------------
  function back() {
    if (phase !== 'done') return;
    // Rebuild the end state at the current size, then run it backwards.
    setZoom(null, 'none');
    const z = measure();
    splashes = makeSplashes(cover.clientWidth, cover.clientHeight, phone());
    if (!reduced) {
      setZoom(z, 'none');
      void zoomEl.offsetWidth; // apply without animating
    }
    phase = 'returning';
    backAt = performance.now() / 1000;
    renderMask(reduced ? 0.2 : 5.5, true);
    cover.toggleAttribute('data-done', false);
    worlds.set({ coverDone: false });
    history.replaceState(history.state, '', location.pathname + location.search);
    go.focus({ preventScroll: true });
    start();
  }

  // ---- Triggers ----------------------------------------------------------
  go.addEventListener('click', next);
  // A wheel or swipe on the cover also turns the page (§5.1).
  cover.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) > 2) next();
    },
    { passive: true },
  );
  let touchY: number | null = null;
  cover.addEventListener('touchstart', (e) => (touchY = e.touches[0]?.clientY ?? null), {
    passive: true,
  });
  cover.addEventListener(
    'touchmove',
    (e) => {
      const y = e.touches[0]?.clientY;
      if (touchY !== null && y !== undefined && touchY - y > 30) {
        touchY = null;
        next();
      }
    },
    { passive: true },
  );
  document.addEventListener('keydown', (e) => {
    if (phase !== 'idle' || e.target !== document.body) return;
    if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
      e.preventDefault();
      next();
    }
  });
  window.addEventListener('pointermove', (e) => hand.pointer(e.clientX, e.clientY), {
    passive: true,
  });

  // The header name goes back to the cover instead of reloading the page.
  document.addEventListener(
    'click',
    (e) => {
      const link = (e.target as Element).closest('[data-cover-back]');
      if (!link || phase !== 'done') return;
      e.preventDefault();
      back();
    },
    true,
  );

  // ---- Start -------------------------------------------------------------
  // A world in the URL (/#contact) skips the cover.
  if (worldIndex(location.hash.slice(1)) !== undefined) {
    phase = 'done';
    cover.toggleAttribute('data-done', true);
    worlds.set({ coverDone: true });
    return;
  }
  worlds.set({ coverDone: false });
  // The handwriting waits for its font (§2.1).
  document.fonts.load(`30px ${family}`).then(start, start);
}
