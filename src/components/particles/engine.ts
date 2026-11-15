/**
 * The particle engine (BUILD_PLAN §10), ported from the reference build(),
 * morphTo() and draw(). One cloud of N dots (1500 desktop, 1000 phone) morphs
 * between shapes; colors blend across worlds; ambient renderers sit under it.
 *
 * Math is ported exactly; the values in §10 are what to check against.
 */
import { objectFrame } from '../../lib/layout';
import { rng } from '../../lib/rng';
import { Ambient } from './ambient';
import { fit, SHAPES, type Pt } from './shapes';

/** Particle colors per world (§2.3): [ink rgb, accent rgb]. */
const WORLD_COLORS: [number[], number[]][] = [
  [
    [240, 246, 252],
    [95, 237, 131],
  ],
  [
    [220, 228, 240],
    [87, 228, 233],
  ],
  [
    [232, 230, 225],
    [255, 198, 39],
  ],
  [
    [11, 18, 32],
    [61, 122, 18],
  ],
  [
    [31, 26, 21],
    [47, 93, 70],
  ],
];

const D = 4.4;
const TAU = Math.PI * 2;

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  phone: boolean;
  reduced: boolean;
  /** CSS font-family list for Geist Mono (ambient code and ledger). */
  mono: string;
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private phone: boolean;
  private reduced: boolean;
  private mono: string;

  private N = 0;
  private shapes: Pt[][] = [];
  private cur = new Float32Array(0);
  private from = new Float32Array(0);
  private curA = new Float32Array(0);
  private fromA = new Float32Array(0);
  private delay = new Float32Array(0);
  private dir = new Float32Array(0);
  private phase = new Float32Array(0);
  private order = new Uint16Array(0);
  private px = new Float32Array(0);
  private py = new Float32Array(0);
  private pz = new Float32Array(0);
  private ambient!: Ambient;

  private target = 0;
  private t0 = 0;
  /** World weights for color blending and ambient cross-fades. */
  private wt = [1, 0, 0, 0, 0];
  private active = 0;
  private ryS: number | undefined;
  private dimNow = 1;
  /** Smoothed pointer offset in -0.5..0.5, and its target. */
  private mx = 0;
  private my = 0;
  private tmx = 0;
  private tmy = 0;
  private moved = false;

  private raf = 0;
  private last = 0;
  private running = false;

  constructor({ canvas, phone, reduced, mono }: EngineOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.phone = phone;
    this.reduced = reduced;
    this.mono = mono;
    this.build();
  }

  /** §10.1: shapes, particles and ambient data from one RNG, seed 7, in this order. */
  private build() {
    const N = this.phone ? 1000 : 1500;
    const R = rng(7);
    this.N = N;
    // All raw shapes first, then fit() each: the same RNG order as the reference.
    const raw = SHAPES.map((shape) => shape(N, R));
    this.shapes = raw.map((pts) => fit(pts, N, R));
    this.cur = new Float32Array(N * 3);
    this.from = new Float32Array(N * 3);
    this.fromA = new Float32Array(N);
    this.curA = new Float32Array(N);
    this.delay = new Float32Array(N);
    this.dir = new Float32Array(N * 3);
    this.phase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const u = R() * 2 - 1,
        th = R() * Math.PI * 2,
        s = Math.sqrt(1 - u * u);
      this.cur[i * 3] = Math.cos(th) * s * 3;
      this.cur[i * 3 + 1] = u * 3;
      this.cur[i * 3 + 2] = Math.sin(th) * s * 3;
      this.delay[i] = (i / N) * 0.55 + R() * 0.25;
      this.dir[i * 3] = Math.cos(th) * s;
      this.dir[i * 3 + 1] = u;
      this.dir[i * 3 + 2] = Math.sin(th) * s;
      this.phase[i] = R() * Math.PI * 2;
    }
    this.from.set(this.cur);
    this.fromA.set(this.curA);
    this.t0 = performance.now() / 1000 + 0.3;
    this.order = new Uint16Array(N);
    this.px = new Float32Array(N);
    this.py = new Float32Array(N);
    this.pz = new Float32Array(N);
    for (let i = 0; i < N; i++) this.order[i] = i;
    this.ambient = new Ambient(R);
  }

  /** §10.2: start morphing from wherever the dots are now to shape k. */
  morphTo(k: number): void {
    if (k === this.target) return;
    this.from.set(this.cur);
    this.fromA.set(this.curA);
    this.target = k;
    this.t0 = performance.now() / 1000;
  }

  /** Colors and ambient renderers ease toward this world. */
  setWorld(i: number): void {
    this.active = i;
  }

  /** Phone ↔ desktop: rebuild with the right N (same seed, same shapes). */
  setPhone(phone: boolean): void {
    if (phone === this.phone) return;
    this.phone = phone;
    const k = this.target;
    this.build();
    this.target = -1;
    this.morphTo(k);
  }

  /** Pointer position in client pixels (parallax and AI cursor tension). */
  pointer(clientX: number, clientY: number): void {
    const W = this.canvas.clientWidth || 1,
      H = this.canvas.clientHeight || 1;
    this.tmx = clientX / W - 0.5;
    this.tmy = clientY / H - 0.5;
    this.moved = true;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (ms: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (ms - this.last) / 1000);
      this.last = ms;
      this.draw(ms / 1000, dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private draw(t: number, dt: number) {
    const c = this.canvas,
      ctx = this.ctx;
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth,
      H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Colors blend across worlds (§10.3).
    for (let k = 0; k < this.wt.length; k++) {
      const g = k === this.active ? 1 : 0;
      this.wt[k] += (g - this.wt[k]) * Math.min(1, dt * 2.2);
    }
    const ws = this.wt.reduce((a, b) => a + b, 0) || 1;
    const mix = (j: 0 | 1) => {
      const o = [0, 0, 0];
      WORLD_COLORS.forEach((w, k) => {
        for (let q = 0; q < 3; q++) o[q] += (w[j][q] * this.wt[k]) / ws;
      });
      return `rgb(${o.map(Math.round).join(',')})`;
    };
    const INK = mix(0),
      ACC = mix(1);

    this.mx += (this.tmx - this.mx) * 0.05;
    this.my += (this.tmy - this.my) * 0.05;

    // §4.3 Object placement (shared with the world UI).
    const { ox, oy, scale } = objectFrame(W, H, this.phone ? 'phone' : 'desktop');
    const F = scale * D;

    for (let k = 0; k < this.wt.length; k++) {
      this.ambient.draw(k, this.wt[k], {
        ctx,
        W,
        H,
        ox,
        oy,
        t,
        phone: this.phone,
        reduced: this.reduced,
        pointer: this.moved ? { x: this.tmx, y: this.tmy } : null,
        mono: this.mono,
      });
    }

    // §10.4 Rotation.
    const full = this.target === 2;
    const gallery = this.target === 4 || this.target === 6;
    let goal: number;
    if (this.reduced) goal = 0.45;
    else if (full) goal = t * 0.2 + 0.5;
    else if (gallery) goal = Math.sin(t * 0.5) * 0.05;
    else if (this.target === 7) goal = Math.sin(t * 0.32) * 0.32;
    else goal = 0.35 + Math.sin(t * 0.45) * 0.45;
    if (this.ryS === undefined) this.ryS = goal;
    if (!full) goal += Math.round((this.ryS - goal) / TAU) * TAU;
    this.ryS += (goal - this.ryS) * (full && Math.abs(goal - this.ryS) < 0.05 ? 1 : 0.035);
    const calm = gallery ? 0.06 : 1;
    const ry = this.ryS + this.mx * 0.9 * calm,
      rx = -0.3 + this.my * 0.4 * calm;
    const cY = Math.cos(ry),
      sY = Math.sin(ry),
      cX = Math.cos(rx),
      sX = Math.sin(rx);

    const tgt = this.shapes[this.target];
    if (!tgt) return;
    const DUR = this.reduced ? 0.01 : 1.5;
    const el = t - this.t0;
    const N = this.N;
    // Dim behind open panels: 0.3, or 0.14 in the Accounting panel.
    const dimGoal = this.target === 5 ? (this.active === 3 ? 0.14 : 0.3) : 1;
    this.dimNow += (dimGoal - this.dimNow) * 0.06;

    // §10.2 Morph and §10.3 projection.
    for (let i = 0; i < N; i++) {
      let e = (el - this.delay[i]) / DUR;
      e = e < 0 ? 0 : e > 1 ? 1 : e;
      const k = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
      const w = Math.sin(Math.PI * k) * 0.55;
      const b = this.reduced ? 0 : 0.012 * Math.sin(t * 1.6 + this.phase[i]);
      const T = tgt[i];
      const x = this.from[i * 3] + (T.x - this.from[i * 3]) * k + this.dir[i * 3] * w + b;
      const y =
        this.from[i * 3 + 1] + (T.y - this.from[i * 3 + 1]) * k + this.dir[i * 3 + 1] * w + b;
      const z = this.from[i * 3 + 2] + (T.z - this.from[i * 3 + 2]) * k + this.dir[i * 3 + 2] * w;
      this.cur[i * 3] = x;
      this.cur[i * 3 + 1] = y;
      this.cur[i * 3 + 2] = z;
      this.curA[i] = this.fromA[i] + (T.a - this.fromA[i]) * k;
      const x1 = x * cY + z * sY,
        z1 = -x * sY + z * cY;
      const y1 = y * cX - z1 * sX,
        z2 = y * sX + z1 * cX;
      const s = F / (z2 + D);
      this.px[i] = ox + x1 * s;
      this.py[i] = oy - y1 * s;
      this.pz[i] = z2;
    }

    // Back to front.
    const pz = this.pz;
    this.order.sort((a, b) => pz[b] - pz[a]);
    for (let n = 0; n < N; n++) {
      const i = this.order[n];
      const zc = pz[i] + D;
      const depth = (pz[i] + 1.6) / 3.2;
      const acc = this.curA[i] > 0.5;
      ctx.globalAlpha = Math.max(0.2, Math.min(1, 1 - depth * 0.7)) * this.dimNow;
      ctx.fillStyle = acc ? ACC : INK;
      const r = (acc ? 2.3 : 1.7) * (D / zc);
      ctx.beginPath();
      ctx.arc(this.px[i], this.py[i], r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
