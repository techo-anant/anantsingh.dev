/**
 * Ambient renderers drawn under the particles (BUILD_PLAN §10.5), ported from
 * the reference ambient(). Each is multiplied by its world weight so they
 * cross-fade with the worlds. Phone deltas from the phone reference.
 *
 *   0 Software   two columns of faint scrolling code
 *   1 AI         drifting nodes + links, travelling pulses, cursor tension
 *   2 Robotics   radar rings, crosshair, sweep, blips, a periodic ghost detection
 *   3 Accounting a grid of faint ledger numbers with pulsing ticks
 *   4 Contact    none
 */
type Rand = () => number;

const CODE = [
  'def select_clips(video) -> list[Clip]:',
  '    ranked = rank(describe(video))',
  '    return await_approval(ranked)',
  '$ git commit -m "v5.1: fal.ai provider"',
  '$ ffmpeg -i in.mp4 -vf crop=ih*9/16:ih out.mp4',
  'for (int i = 0; i < n; ++i) dp[i] = max(dp[i-1], a[i]);',
  'railway up --service shorts',
  'async def on_reaction(payload):',
  '    if payload.emoji == APPROVE: upload(clip)',
  'import sys; input = sys.stdin.readline',
  'const solve = (g) => bfs(g, 0);',
  '$ npm run build',
  '[ok] 42 tests passed',
  'SELECT * FROM jobs WHERE status = "pending";',
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hot: number;
}

export interface AmbientFrame {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  ox: number;
  oy: number;
  t: number;
  phone: boolean;
  reduced: boolean;
  /** Pointer in -0.5..0.5 of the screen, or null before the first move. */
  pointer: { x: number; y: number } | null;
  /** CSS font-family list for Geist Mono. */
  mono: string;
}

export class Ambient {
  private nodes: Node[] = [];
  private pulses: { a: number; b: number; p: number }[] = [];
  private blips: { a: number; r: number }[] = [];
  private cells: { c: number; r: number; s: number; tick: boolean }[] = [];

  /** Must be called with the engine's RNG right after the particles (§10.1 order). */
  constructor(R: Rand) {
    for (let i = 0; i < 80; i++)
      this.nodes.push({ x: R(), y: R(), vx: (R() - 0.5) * 0.008, vy: (R() - 0.5) * 0.008, hot: 0 });
    for (let i = 0; i < 10; i++)
      this.pulses.push({ a: Math.floor(R() * 80), b: Math.floor(R() * 80), p: R() });
    for (let i = 0; i < 26; i++) this.blips.push({ a: R() * Math.PI * 2, r: 90 + R() * 380 });
    for (let c = 0; c < 5; c++)
      for (let r = 0; r < 24; r++) this.cells.push({ c, r, s: R() * 1000, tick: R() < 0.12 });
  }

  draw(k: number, a: number, f: AmbientFrame): void {
    if (a < 0.01) return;
    if (k === 0) this.software(a, f);
    else if (k === 1) this.ai(a, f);
    else if (k === 2) this.robotics(a, f);
    else if (k === 3) this.accounting(a, f);
  }

  private software(a: number, { ctx, W, H, t, phone, reduced, mono }: AmbientFrame) {
    ctx.font = `${phone ? 11 : 13}px ${mono}`;
    const lh = phone ? 19 : 22,
      n = CODE.length;
    const off = reduced ? 0 : (t * 16) % (n * lh);
    const cols = phone ? [16, W * 0.56] : [W * 0.47, W * 0.72];
    cols.forEach((cx, ci) => {
      for (let r = -1; r < H / lh + 2; r++) {
        const y = r * lh - (off % lh) + 14;
        const line = CODE[(r + Math.floor(off / lh) + ci * 5 + n) % n];
        ctx.globalAlpha = a * (ci === 0 ? 0.05 : 0.035);
        ctx.fillStyle = r % 4 === 0 ? '#5FED83' : '#F0F6FC';
        ctx.fillText(line, cx, y);
      }
    });
  }

  private ai(a: number, { ctx, W, H, reduced, pointer }: AmbientFrame) {
    const N = this.nodes;
    if (!reduced)
      N.forEach((n) => {
        n.x += n.vx * 0.016;
        n.y += n.vy * 0.016;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#57E4E9';
    for (let i = 0; i < N.length; i++)
      for (let j = i + 1; j < N.length; j++) {
        const dx = (N[i].x - N[j].x) * W,
          dy = (N[i].y - N[j].y) * H,
          d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          ctx.globalAlpha = a * 0.12 * (1 - d / 150);
          ctx.beginPath();
          ctx.moveTo(N[i].x * W, N[i].y * H);
          ctx.lineTo(N[j].x * W, N[j].y * H);
          ctx.stroke();
        }
      }
    // Cursor tension: nearby nodes reach for the pointer and light up.
    if (pointer) {
      const qx = (pointer.x + 0.5) * W,
        qy = (pointer.y + 0.5) * H;
      ctx.strokeStyle = '#57E4E9';
      N.forEach((n) => {
        const d = Math.hypot(n.x * W - qx, n.y * H - qy);
        if (d < 320) {
          const w = 1 - d / 320;
          ctx.globalAlpha = a * (0.25 + 0.6 * w) * w;
          ctx.lineWidth = 0.8 + 1.4 * w;
          ctx.beginPath();
          ctx.moveTo(n.x * W, n.y * H);
          ctx.lineTo(qx, qy);
          ctx.stroke();
          n.hot = w;
        } else n.hot = 0;
      });
      ctx.lineWidth = 1;
      ctx.globalAlpha = a * 0.7;
      ctx.beginPath();
      ctx.arc(qx, qy, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    N.forEach((n) => {
      const h = n.hot;
      ctx.globalAlpha = a * (0.35 + 0.6 * h);
      ctx.fillStyle = h > 0.05 ? '#57E4E9' : '#ECEFF4';
      ctx.beginPath();
      ctx.arc(n.x * W, n.y * H, 1.6 + 2.2 * h, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#57E4E9';
    this.pulses.forEach((p) => {
      if (!reduced) p.p += 0.006;
      if (p.p >= 1) {
        p.p = 0;
        p.a = p.b;
        let best = -1,
          bd = 1e9;
        for (let j = 0; j < N.length; j++) {
          if (j === p.a) continue;
          const dx = N[j].x - N[p.a].x,
            dy = N[j].y - N[p.a].y,
            d = dx * dx + dy * dy + Math.random() * 0.01;
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        p.b = best;
      }
      const A = N[p.a],
        B = N[p.b];
      ctx.globalAlpha = a * 0.9;
      ctx.beginPath();
      ctx.arc((A.x + (B.x - A.x) * p.p) * W, (A.y + (B.y - A.y) * p.p) * H, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private robotics(a: number, { ctx, ox, oy, t, phone, reduced }: AmbientFrame) {
    const rings = phone ? [60, 120, 180, 240] : [110, 220, 330, 440];
    const cross = phone ? 260 : 470,
      sweepR = phone ? 250 : 460,
      blipK = phone ? 0.55 : 1;
    ctx.strokeStyle = '#FFC627';
    ctx.lineWidth = 1;
    rings.forEach((r) => {
      ctx.globalAlpha = a * 0.13;
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = a * 0.1;
    ctx.beginPath();
    ctx.moveTo(ox - cross, oy);
    ctx.lineTo(ox + cross, oy);
    ctx.moveTo(ox, oy - cross);
    ctx.lineTo(ox, oy + cross);
    ctx.stroke();
    const sw = reduced ? 0.6 : (t * 1.1) % (Math.PI * 2);
    ctx.fillStyle = '#FFC627';
    for (let w = 0; w < 18; w++) {
      ctx.globalAlpha = a * 0.13 * (1 - w / 18);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, sweepR, sw - (w + 1) * 0.035, sw - w * 0.035);
      ctx.closePath();
      ctx.fill();
    }
    this.blips.forEach((b) => {
      let d = (sw - b.a) % (Math.PI * 2);
      if (d < 0) d += Math.PI * 2;
      const v = Math.max(0, 1 - d / 2.4);
      ctx.globalAlpha = a * v * 0.9;
      ctx.beginPath();
      ctx.arc(
        ox + Math.cos(b.a) * b.r * blipK,
        oy + Math.sin(b.a) * b.r * blipK,
        phone ? 2.2 : 2.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    if (!reduced) {
      // A ghost detection: flickers, gets crossed out, fades. No text label (§7.3).
      const cyc = Math.floor(t / 7),
        ph = (t % 7) / 7;
      if (ph > 0.15 && ph < 0.75) {
        const ga = (cyc * 2.399) % (Math.PI * 2),
          gr = phone ? 80 + ((cyc * 97) % 140) : 150 + ((cyc * 97) % 260);
        const gx = ox + Math.cos(ga) * gr,
          gy = oy + Math.sin(ga) * gr;
        const fl = ph < 0.45 ? 0.55 + 0.45 * Math.sin(t * 30) : 1;
        ctx.fillStyle = '#FF5A4E';
        ctx.strokeStyle = '#FF5A4E';
        ctx.globalAlpha = a * fl * Math.min(1, (0.75 - ph) * 8);
        ctx.beginPath();
        ctx.arc(gx, gy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(gx, gy, 12 + (ph - 0.15) * 30, 0, Math.PI * 2);
        ctx.stroke();
        if (ph > 0.45) {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx - 7, gy - 7);
          ctx.lineTo(gx + 7, gy + 7);
          ctx.moveTo(gx + 7, gy - 7);
          ctx.lineTo(gx - 7, gy + 7);
          ctx.stroke();
        }
        ctx.fillStyle = '#FFC627';
        ctx.strokeStyle = '#FFC627';
        ctx.lineWidth = 1;
      }
    }
  }

  private accounting(a: number, { ctx, W, t: now, phone, reduced, mono }: AmbientFrame) {
    // Reduced motion: the numbers and ticks hold still (§12).
    const t = reduced ? 0 : now;
    ctx.font = `${phone ? 10 : 13}px ${mono}`;
    ctx.textAlign = 'right';
    this.cells.forEach((c) => {
      const x = phone ? 76 + c.c * 72 : W * 0.5 + c.c * 150,
        y = c.r * 36 + 26;
      const v = Math.floor(((c.s + Math.floor(t / 2.6 + c.s)) * 7919) % 99999);
      const txt = (v / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      ctx.globalAlpha = a * 0.065;
      ctx.fillStyle = '#00338D';
      ctx.fillText(txt, x, y);
      if (c.tick) {
        const pulse = (Math.sin(t * 1.2 + c.s) + 1) / 2;
        ctx.globalAlpha = a * 0.5 * pulse;
        ctx.strokeStyle = '#3D7A12';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + 8, y - 5);
        ctx.lineTo(x + 12, y - 1);
        ctx.lineTo(x + 20, y - 10);
        ctx.stroke();
      }
    });
    ctx.textAlign = 'left';
  }
}
