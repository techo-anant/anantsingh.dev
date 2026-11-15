/**
 * The cover's handwriting and reading lamp (BUILD_PLAN §5.3), ported from the
 * reference setup(), spawn() and draw().
 *
 * Lines write themselves word by word, hold, then fade. Words near the lamp
 * are sharp and dark; far ones are faint and blurred. Words wrapped in ~tildes~
 * get a wavy strike-through after they are written.
 */

interface Word {
  w: string;
  x0: number;
  x1: number;
  strike: boolean;
}

interface Line {
  row: number;
  x: number;
  y: number;
  size: number;
  rot: number;
  words: Word[];
  total: number;
  born: number;
  writeDur: number;
  hold: number;
  fadeDur: number;
}

/** Per-layout values (desktop first, phone second in the spec). */
const PARAMS = {
  desktop: {
    rowH: 50,
    top: 74,
    bottomGap: 80,
    titleGap: 120,
    size: [25, 9],
    margin: 70,
    lamp: 260,
    near: 190,
  },
  phone: {
    rowH: 40,
    top: 70,
    bottomGap: 44,
    titleGap: 110,
    size: [17, 5],
    margin: 20,
    lamp: 200,
    near: 150,
  },
} as const;

/** Phone: split fragments into chunks of at most 28 characters at word boundaries. */
export function chunkFragments(frags: string[], max = 28): string[] {
  return frags.reduce<string[]>((out, f) => {
    let cur = '';
    f.split(' ').forEach((w) => {
      if (cur && (cur + ' ' + w).length > max) {
        out.push(cur);
        cur = w;
      } else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) out.push(cur);
    return out;
  }, []);
}

export class Handwriting {
  private lines: Line[] = [];
  private fi = 0;
  private lastSpawn = -10;
  private px = -999;
  private py = -999;
  private lastMove = -100;
  private lx = 0;
  private ly = 0;
  private t0 = performance.now() / 1000;
  private ctx: CanvasRenderingContext2D | null;

  constructor(
    private canvas: HTMLCanvasElement,
    private fragments: { desktop: string[]; phone: string[] },
    /** CSS font-family list for La Belle Aurore (from --font-hand). */
    private family: string,
    private reduced: boolean,
  ) {
    this.ctx = canvas.getContext('2d');
  }

  pointer(clientX: number, clientY: number): void {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    // The canvas may be scaled by the zoom; map back to its own pixels.
    this.px = (clientX - r.left) * (this.canvas.clientWidth / r.width);
    this.py = (clientY - r.top) * (this.canvas.clientHeight / r.height);
    this.lastMove = performance.now() / 1000;
  }

  private font(size: number) {
    return `${size}px ${this.family}`;
  }

  private spawn(t: number, W: number, H: number, phone: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const P = phone ? PARAMS.phone : PARAMS.desktop;
    const rows: number[] = [];
    for (let y = P.top; y < H - P.bottomGap; y += P.rowH) rows.push(y);
    const busy = new Set(this.lines.map((l) => l.row));
    const free = rows
      .map((_, i) => i)
      .filter((i) => !busy.has(i) && Math.abs((rows[i] as number) - H * 0.45) > P.titleGap);
    if (!free.length) return;
    const row = free[Math.floor(Math.random() * free.length)] as number;
    const frags = phone ? this.fragments.phone : this.fragments.desktop;
    const raw = frags[this.fi++ % frags.length] ?? '';
    const size = P.size[0] + Math.random() * P.size[1];
    ctx.font = this.font(size);
    const words: Word[] = [];
    let x = 0;
    const space = ctx.measureText(' ').width;
    raw.split(' ').forEach((p) => {
      const strike = p.length > 2 && p[0] === '~' && p[p.length - 1] === '~';
      const w = strike ? p.slice(1, -1) : p;
      const ww = ctx.measureText(w).width;
      words.push({ w, x0: x, x1: x + ww, strike });
      x += ww + space;
    });
    const total = x - space;
    const maxX = W - P.margin - total;
    if (maxX < P.margin) return;
    const x0 = P.margin + Math.random() * (maxX - P.margin);
    const writeDur = total / (150 + Math.random() * 60);
    this.lines.push({
      row,
      x: x0,
      y: (rows[row] as number) + (Math.random() - 0.5) * 8,
      size,
      rot: (Math.random() - 0.5) * 0.025,
      words,
      total,
      born: t,
      writeDur,
      hold: 4 + Math.random() * 4,
      fadeDur: 3,
    });
  }

  /** Draws one frame at time t (s). `spawn` is false while the page is turning. */
  draw(t: number, { spawn, phone }: { spawn: boolean; phone: boolean }): void {
    const c = this.canvas;
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth,
      H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const P = phone ? PARAMS.phone : PARAMS.desktop;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const el = t - this.t0;

    // The lamp follows the pointer; after 4 s without movement it wanders.
    const idle = t - this.lastMove > 4;
    const wx = W * (0.5 + 0.36 * Math.sin(el * 0.13)),
      wy = H * (0.5 + 0.34 * Math.sin(el * 0.21 + 1));
    const tx = idle ? wx : this.px,
      ty = idle ? wy : this.py;
    const k = idle ? 0.02 : 0.18;
    this.lx += (tx - this.lx) * k;
    this.ly += (ty - this.ly) * k;
    const lg = ctx.createRadialGradient(this.lx, this.ly, 0, this.lx, this.ly, P.lamp);
    lg.addColorStop(0, 'rgba(255,248,226,0.55)');
    lg.addColorStop(1, 'rgba(255,248,226,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);

    const every = this.reduced ? 3 : 1.5;
    if (spawn && el > 1.2 && el - this.lastSpawn > every && this.lines.length < 9) {
      this.spawn(el, W, H, phone);
      this.lastSpawn = el;
    }

    const R = P.near;
    this.lines = this.lines.filter((L) => {
      const age = el - L.born;
      const life = L.writeDur + L.hold + L.fadeDur;
      if (age > life) return false;
      const wp = this.reduced ? 1 : Math.min(1, age / L.writeDur);
      const fade = age < L.writeDur + L.hold ? 1 : 1 - (age - L.writeDur - L.hold) / L.fadeDur;
      const xw = wp * L.total;
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.rotate(L.rot);
      ctx.font = this.font(L.size);
      ctx.textBaseline = 'alphabetic';
      L.words.forEach((w) => {
        if (w.x0 > xw) return;
        const cx = L.x + (w.x0 + w.x1) / 2,
          cy = L.y - L.size * 0.3;
        const d = Math.hypot(cx - this.lx, cy - this.ly);
        const prox = Math.max(0, 1 - d / R);
        const pe = prox * prox * (3 - 2 * prox);
        const fresh = Math.max(0, 1 - (xw - w.x1) / 160);
        const a = fade * (0.13 + 0.07 * fresh + 0.72 * pe);
        if (a < 0.01) return;
        const blur = Math.max(0, 1.6 * (1 - pe * 2.5));
        ctx.filter = blur > 0.15 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
        ctx.globalAlpha = a;
        ctx.fillStyle = '#2A241D';
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          w.x0 - 6,
          -L.size * 1.4,
          Math.max(0, Math.min(w.x1 + 12, xw) - w.x0 + 6),
          L.size * 2.2,
        );
        ctx.clip();
        ctx.fillText(w.w, w.x0, 0);
        ctx.restore();
        if (w.strike && xw > w.x1 + 18) {
          const sp = Math.min(1, (xw - w.x1 - 18) / 40);
          ctx.strokeStyle = '#2A241D';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          const x1 = w.x0 - 3 + (w.x1 - w.x0 + 6) * sp;
          for (let x = w.x0 - 3; x <= x1; x += 4) {
            const y = -L.size * 0.28 + Math.sin(x * 0.35) * 1.6;
            if (x === w.x0 - 3) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });
      ctx.filter = 'none';
      if (wp < 1) {
        // The pen tip.
        ctx.globalAlpha = 0.5 * fade;
        ctx.fillStyle = '#2A241D';
        ctx.beginPath();
        ctx.arc(xw + 2, -L.size * 0.25 + Math.sin(el * 30) * 2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    });
    ctx.globalAlpha = 1;
  }
}
