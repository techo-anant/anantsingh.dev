/**
 * The ink splash transition (BUILD_PLAN §5.4), ported from the reference
 * splash(), makeSplashes(), inkSprite(), drawInk() and updateMask().
 *
 * The constants are tuned by hand: do not "clean them up". Each splash is a
 * metaball field (central lobe, side lobes, optional tail, edge bumps, streaks
 * with bulb tips, flying droplets, drips) drawn with a soft sprite in
 * 'lighter' mode, then thresholded into a white mask.
 */
import { rng } from '../../lib/rng';

interface Lobe {
  x: number;
  y: number;
  rr: number;
  lag: number;
}
interface Bump {
  x: number;
  y: number;
  rr: number;
}
interface Streak {
  a: number;
  len: number;
  w: number;
  bulb: number;
  curve: number;
  lag: number;
  dur: number;
}
interface Drop {
  a: number;
  d: number;
  rr: number;
  lag: number;
  dur: number;
}
interface Drip {
  x: number;
  y: number;
  len: number;
  w: number;
  start: number;
  dur: number;
}

export interface Splash {
  cx: number;
  cy: number;
  R: number;
  /** Start time relative to ink time (s). */
  at: number;
  lobes: Lobe[];
  bumps: Bump[];
  streaks: Streak[];
  drops: Drop[];
  drips: Drip[];
}

export function splash(cx: number, cy: number, R: number, at: number, seed: number): Splash {
  const r = rng(seed);
  const axis = r() * Math.PI,
    el = 0.25 + r() * 0.4;
  const st = (ang: number) => 1 + el * Math.abs(Math.cos(ang - axis));
  const lobes: Lobe[] = [{ x: 0, y: 0, rr: 1, lag: 0 }];
  const nl = 4 + Math.floor(r() * 4);
  for (let i = 0; i < nl; i++) {
    const ang = r() * Math.PI * 2,
      d = (0.25 + r() * 0.55) * st(ang);
    lobes.push({
      x: Math.cos(ang) * d,
      y: Math.sin(ang) * d,
      rr: 0.36 + r() * 0.34,
      lag: r() * 0.05,
    });
  }
  if (r() < 0.7) {
    const ang = axis + (r() < 0.5 ? 0 : Math.PI),
      d = 1.15 + r() * 0.35;
    lobes.push({ x: Math.cos(ang) * d * 0.55, y: Math.sin(ang) * d * 0.55, rr: 0.32, lag: 0.04 });
    lobes.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d, rr: 0.55 + r() * 0.2, lag: 0.06 });
  }
  const bumps: Bump[] = [];
  for (let i = 0; i < 40; i++) {
    const ang = r() * Math.PI * 2,
      d = (0.82 + r() * 0.28) * st(ang);
    bumps.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d, rr: 0.06 + r() * 0.12 });
  }
  const streaks: Streak[] = [];
  const ns = 14 + Math.floor(r() * 16);
  for (let i = 0; i < ns; i++) {
    const ang = r() * Math.PI * 2;
    streaks.push({
      a: ang,
      len: (0.5 + Math.pow(r(), 0.8) * 1.8) * st(ang),
      w: 0.035 + r() * 0.05,
      bulb: 0.025 + r() * 0.055,
      curve: (r() - 0.5) * 0.35,
      lag: r() * 0.06,
      dur: 0.16 + r() * 0.22,
    });
  }
  const drops: Drop[] = [];
  const nd = 80 + Math.floor(r() * 90);
  for (let i = 0; i < nd; i++) {
    const near = streaks[Math.floor(r() * streaks.length)] as Streak;
    const ang = r() < 0.55 ? near.a + (r() - 0.5) * 0.25 : r() * Math.PI * 2;
    drops.push({
      a: ang,
      d: (1.1 + Math.pow(r(), 1.5) * 2.6) * st(ang),
      rr: 0.008 + Math.pow(r(), 3) * 0.055,
      lag: r() * 0.1,
      dur: 0.2 + r() * 0.3,
    });
  }
  const drips: Drip[] = [];
  const nr = 2 + Math.floor(r() * 3);
  for (let i = 0; i < nr; i++) {
    drips.push({
      x: (r() - 0.5) * 1.1,
      y: 0.55 + r() * 0.35,
      len: 0.35 + r() * 1.1,
      w: 0.04 + r() * 0.04,
      start: 0.4 + r() * 0.5,
      dur: 1.4 + r() * 1.4,
    });
  }
  return { cx, cy, R, at, lobes, bumps, streaks, drops, drips };
}

/** The three splashes (§5.4 step 3). Phone uses U = max(W, H) and higher/lower y. */
export function makeSplashes(W: number, H: number, phone: boolean): Splash[] {
  const U = phone ? Math.max(W, H) : W;
  return [
    splash(W * 0.3, H * (phone ? 0.4 : 0.44), U * 0.085, 0, 3),
    splash(W * 0.71, H * (phone ? 0.62 : 0.6), U * 0.1, 0.75, 9),
    splash(W * 0.5, H * 0.5, U * 0.24, 1.5, 17),
  ];
}

let sprite: HTMLCanvasElement | undefined;

function inkSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const o = c.getContext('2d');
  if (o) {
    const g = o.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.38, 'rgba(255,255,255,0.86)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = g;
    o.fillRect(0, 0, 64, 64);
  }
  sprite = c;
  return c;
}

/** Draws one splash at time ts (s since it landed), scaled by k into the mask canvas. */
function drawInk(ctx: CanvasRenderingContext2D, S: Splash, ts: number, k: number): void {
  const spr = inkSprite();
  const eo = (u: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
  const P = (x: number, y: number, rad: number) => {
    if (rad <= 0) return;
    const X = (S.cx + x * S.R) * k,
      Y = (S.cy + y * S.R) * k,
      rr = Math.max(0.7, rad * S.R * k);
    ctx.drawImage(spr, X - 2 * rr, Y - 2 * rr, 4 * rr, 4 * rr);
  };
  const gB = eo(ts / 0.14) * (1 + 0.1 * Math.min(1, Math.max(0, ts) / 2));
  S.lobes.forEach((l) => {
    const g = eo((ts - l.lag) / 0.14) * (gB > 0 ? gB / Math.max(0.001, eo(ts / 0.14)) : 0);
    P(l.x * g, l.y * g, l.rr * g);
  });
  S.bumps.forEach((b) => P(b.x * gB, b.y * gB, b.rr * gB));
  S.streaks.forEach((sk) => {
    const p = eo((ts - sk.lag) / sk.dur);
    if (p <= 0) return;
    const tip = 0.75 + sk.len * p;
    let d = 0.75;
    while (d < tip) {
      const u = (d - 0.75) / sk.len;
      const w = sk.w * Math.pow(Math.max(0, 1 - u), 1.3) + 0.006;
      const a = sk.a + sk.curve * u * u;
      P(Math.cos(a) * d, Math.sin(a) * d, w);
      d += Math.max(0.015, w * 0.6);
    }
    const ta = sk.a + sk.curve;
    P(
      Math.cos(ta) * tip,
      Math.sin(ta) * tip,
      sk.bulb * Math.max(0, Math.min(1, (p - 0.55) / 0.45)),
    );
  });
  S.drops.forEach((dp) => {
    const p = eo((ts - dp.lag) / dp.dur);
    if (p <= 0) return;
    P(Math.cos(dp.a) * dp.d * p, Math.sin(dp.a) * dp.d * p, dp.rr * (0.4 + 0.6 * p));
  });
  S.drips.forEach((dr) => {
    const q = eo((ts - dr.start) / dr.dur);
    if (q <= 0) return;
    const L = dr.len * q;
    let y = 0;
    while (y < L) {
      const u = y / dr.len;
      P(dr.x, dr.y + y, dr.w * (1 - 0.45 * u));
      y += Math.max(0.012, dr.w * 0.5);
    }
    P(dr.x, dr.y + L, dr.w * 1.15 * q);
  });
}

export interface MaskFrame {
  /** CSS mask-image value, or '' when there is no ink yet. */
  image: string;
  /** True once the bleed has dissolved the whole page. */
  complete: boolean;
}

/**
 * Renders the ink mask for ink time e (s since the click; the first splash
 * lands at e = 1.6). White = cover visible, transparent = ink (worlds show).
 */
export class InkMask {
  private canvas = document.createElement('canvas');

  render(
    e: number,
    W: number,
    H: number,
    splashes: Splash[],
    { phone, reduced }: { phone: boolean; reduced: boolean },
  ): MaskFrame {
    const s0 = reduced ? 0 : 1.6;
    const se = reduced ? 9 : e - s0;
    if (se <= 0) return { image: '', complete: false };

    const fw = phone ? Math.round(Math.min(800, W * 1.25)) : 800;
    const fh = Math.round((fw * H) / W),
      k = fw / W;
    const mc = this.canvas;
    if (mc.width !== fw || mc.height !== fh) {
      mc.width = fw;
      mc.height = fh;
    }
    const ctx = mc.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { image: '', complete: true };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, fw, fh);
    ctx.globalCompositeOperation = 'lighter';
    splashes.forEach((S) => {
      const ts = se - S.at;
      if (ts > 0) drawInk(ctx, S, ts, k);
    });

    // Once the last splash has landed, the ink bleeds across what is left of the page.
    const last = splashes[splashes.length - 1];
    const lt = se - (last?.at ?? 0);
    const f = Math.max(0, Math.min(1, (lt - 1.2) / 1.0));
    const bleed = f * f * (3 - 2 * f) * 0.62;
    const img = ctx.getImageData(0, 0, fw, fh),
      d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i + 3] as number) / 255 + bleed;
      let ink = (v - 0.46) / 0.08;
      ink = ink < 0 ? 0 : ink > 1 ? 1 : ink * ink * (3 - 2 * ink);
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255 * (1 - ink);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.putImageData(img, 0, 0);
    return { image: `url(${mc.toDataURL('image/png')})`, complete: f >= 1 || reduced };
  }
}
