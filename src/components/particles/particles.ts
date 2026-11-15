/**
 * Connects the particle engine to the worlds (BUILD_PLAN §3.4, §10.6):
 * the active world picks the shape (shapeOf = [0, 1, 2, 3, 7]) and the colors,
 * the layout picks N, the pointer drives parallax, and the loop pauses while
 * the tab is hidden. It keeps running under the cover so the ink reveals a
 * live scene.
 */
import { prefersReducedMotion } from '../../lib/layout';
import { worlds } from '../worlds/worlds';
import { ParticleEngine } from './engine';
import { SHAPE_OF } from './shapes';

export function initParticles(): ParticleEngine | undefined {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-particles]');
  if (!canvas) return undefined;

  const mono =
    getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
    'monospace';
  const engine = new ParticleEngine({
    canvas,
    phone: worlds.get().layout === 'phone',
    reduced: prefersReducedMotion(),
    mono,
  });

  worlds.subscribe((s) => {
    engine.setPhone(s.layout === 'phone');
    engine.setWorld(s.active);
    // §3.4: gallery → 4 (Software) or 6 (AI); open project → 5 (dimmed scatter).
    const panelOpen = s.proj !== 'idle' && s.pw === s.active;
    if (panelOpen && s.proj === 'gallery') engine.morphTo(s.pw === 1 ? 6 : 4);
    else if (panelOpen && s.proj === 'focus') engine.morphTo(5);
    else engine.morphTo(SHAPE_OF[s.active]);
  });

  window.addEventListener('pointermove', (e) => engine.pointer(e.clientX, e.clientY), {
    passive: true,
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) engine.stop();
    else engine.start();
  });
  if (!document.hidden) engine.start();
  return engine;
}
