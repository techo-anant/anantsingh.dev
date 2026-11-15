/**
 * Particle shapes (BUILD_PLAN §10.1), ported verbatim from the reference
 * shapeCode(), shapeNet(), shapeRover(), shapeCoins(), shapeGallery(),
 * shapeScatter(), shapeGalleryAI(), shapeBook() and fit().
 *
 * The constants are tuned: do not "clean them up". Points live in object
 * space (roughly -1.5..1.5); `a = 1` marks accent-colored points.
 */
export interface Pt {
  x: number;
  y: number;
  z: number;
  a: number;
}

type Rand = () => number;
type P2 = [number, number];

/** Pads to N by resampling, then sorts by y so morphs sweep vertically. */
export function fit(pts: Pt[], N: number, R: Rand): Pt[] {
  const out = pts.slice(0, N);
  while (out.length < N) {
    const q = pts[Math.floor(R() * pts.length)];
    out.push({ x: q.x, y: q.y, z: q.z, a: q.a });
  }
  out.sort((p, q) => p.y - q.y);
  return out;
}

interface Poly {
  pts: P2[];
  closed: boolean;
  a: number;
}

/** Samples N points uniformly along the outlines of flat (2D) polygons. */
function samplePolys(polys: Poly[], N: number, R: Rand): Pt[] {
  const segs: { A: P2; B: P2; L: number; a: number }[] = [];
  polys.forEach((P) => {
    const n = P.pts.length,
      m = P.closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const A = P.pts[i],
        B = P.pts[(i + 1) % n];
      segs.push({ A, B, L: Math.hypot(B[0] - A[0], B[1] - A[1]), a: P.a });
    }
  });
  const tot = segs.reduce((q, g) => q + g.L, 0);
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    let u = R() * tot,
      k = 0;
    while (u > segs[k].L && k < segs.length - 1) {
      u -= segs[k].L;
      k++;
    }
    const g = segs[k],
      f = g.L ? u / g.L : 0;
    pts.push({
      x: g.A[0] + (g.B[0] - g.A[0]) * f,
      y: g.A[1] + (g.B[1] - g.A[1]) * f,
      z: (R() - 0.5) * 0.06,
      a: g.a,
    });
  }
  return pts;
}

function polyBuilder(circleSteps: number) {
  const polys: Poly[] = [];
  const rect = (cx: number, cy: number, w: number, h: number, a: number) =>
    polys.push({
      pts: [
        [cx - w / 2, cy - h / 2],
        [cx + w / 2, cy - h / 2],
        [cx + w / 2, cy + h / 2],
        [cx - w / 2, cy + h / 2],
      ],
      closed: true,
      a,
    });
  const line = (pts: P2[], a: number) => polys.push({ pts, closed: false, a });
  const circ = (cx: number, cy: number, r: number, a: number) => {
    const pts: P2[] = [];
    for (let i = 0; i < circleSteps; i++) {
      const t = (i / circleSteps) * Math.PI * 2;
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    polys.push({ pts, closed: true, a });
  };
  return { polys, rect, line, circ };
}

/** 4: Software gallery: film strip (Shorts), picture frame (Thumbnails), wheel (motion). */
export function shapeGallery(N: number, R: Rand): Pt[] {
  const { polys, rect, line, circ } = polyBuilder(28);
  // film strip: the Shorts pipeline
  const fx = -1.05,
    fy = 0.55;
  rect(fx, fy, 1.1, 0.62, 0);
  for (let i = 0; i < 7; i++) {
    rect(fx - 0.45 + i * 0.15, fy + 0.25, 0.06, 0.05, 0);
    rect(fx - 0.45 + i * 0.15, fy - 0.25, 0.06, 0.05, 0);
  }
  rect(fx - 0.33, fy, 0.3, 0.32, 0);
  rect(fx, fy, 0.3, 0.32, 1);
  rect(fx + 0.33, fy, 0.3, 0.32, 0);
  // picture frame: the thumbnail generator
  const px = 1.05,
    py = 0.55;
  rect(px, py, 0.92, 0.66, 0);
  rect(px, py, 0.76, 0.5, 0);
  line(
    [
      [px - 0.36, py - 0.22],
      [px - 0.12, py + 0.06],
      [px + 0.02, py - 0.08],
      [px + 0.2, py + 0.12],
      [px + 0.36, py - 0.22],
    ],
    0,
  );
  circ(px + 0.2, py + 0.13, 0.06, 1);
  // wheel: the motion library
  const wx = 0,
    wy = -0.75;
  circ(wx, wy, 0.42, 0);
  circ(wx, wy, 0.33, 0);
  circ(wx, wy, 0.07, 1);
  for (let i = 0; i < 9; i++) {
    const t = (i / 9) * Math.PI * 2;
    const c = Math.cos(t),
      s2 = Math.sin(t);
    line(
      [
        [wx + c * 0.33 - s2 * 0.05, wy + s2 * 0.33 + c * 0.05],
        [wx + c * 0.42 + s2 * 0.05, wy + s2 * 0.42 - c * 0.05],
      ],
      1,
    );
  }
  return samplePolys(polys, N, R);
}

/** 6: AI gallery: DANCE clusters, a token grid with one chosen, a falling loss curve. */
export function shapeGalleryAI(N: number, R: Rand): Pt[] {
  const { polys, rect, line, circ } = polyBuilder(24);
  // DANCE: clusters with their prototypes
  const dx = -1.05,
    dy = 0.55;
  (
    [
      [-0.3, 0.12],
      [0.26, 0.16],
      [0.02, -0.18],
    ] as P2[]
  ).forEach((c, i) => {
    circ(dx + c[0], dy + c[1], 0.05, 0);
    circ(dx + c[0], dy + c[1], 0.11, 0);
    circ(dx + c[0], dy + c[1], 0.17, i === 0 ? 1 : 0);
  });
  // tokens: a grid with one chosen
  const tx = 1.05,
    ty = 0.55;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      rect(tx - 0.34 + c * 0.17, ty + 0.17 - r * 0.17, 0.12, 0.12, r === 1 && c === 3 ? 1 : 0);
  // learning: axes and a falling loss curve
  const lx = 0,
    ly = -0.75;
  line(
    [
      [lx - 0.48, ly + 0.36],
      [lx - 0.48, ly - 0.3],
      [lx + 0.5, ly - 0.3],
    ],
    0,
  );
  const cv: P2[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20,
      x = lx - 0.42 + u * 0.9;
    cv.push([x, ly - 0.24 + 0.55 * Math.exp(-3.6 * u)]);
  }
  line(cv, 1);
  return samplePolys(polys, N, R);
}

/** 5: a loose dimmed cloud behind open project panels. */
export function shapeScatter(N: number, R: Rand): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const u = R() * 2 - 1,
      th = R() * Math.PI * 2,
      s = Math.sqrt(1 - u * u),
      r = 1.4 + R() * 1.2;
    let x = Math.cos(th) * s * r * 1.15;
    const z = Math.sin(th) * s * r;
    if (x < -1.2) x = -1.2 - (x + 1.2) * 0.15;
    pts.push({ x, y: u * r * 0.95, z, a: R() < 0.06 ? 1 : 0 });
  }
  return pts;
}

/** 0: a 3D "</>" with the slash in accent. */
export function shapeCode(N: number, R: Rand): Pt[] {
  const segs = [
    [-0.48, 0.52, -1.08, 0, 0],
    [-1.08, 0, -0.48, -0.52, 0],
    [0.22, 0.72, -0.22, -0.72, 1],
    [0.48, 0.52, 1.08, 0, 0],
    [1.08, 0, 0.48, -0.52, 0],
  ];
  const lens = segs.map((s) => Math.hypot(s[2] - s[0], s[3] - s[1]));
  const tot = lens.reduce((a, b) => a + b, 0);
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    let u = R() * tot,
      k = 0;
    while (u > lens[k] && k < segs.length - 1) {
      u -= lens[k];
      k++;
    }
    const s = segs[k],
      t = R();
    const dx = s[2] - s[0],
      dy = s[3] - s[1],
      L = lens[k];
    const nx = -dy / L,
      ny = dx / L;
    let off: number, z: number;
    if (R() < 0.55) {
      off = (R() - 0.5) * 0.18;
      z = R() < 0.5 ? -0.16 : 0.16;
    } else {
      off = R() < 0.5 ? -0.09 : 0.09;
      z = (R() - 0.5) * 0.32;
    }
    pts.push({ x: s[0] + dx * t + nx * off, y: s[1] + dy * t + ny * off, z, a: s[4] });
  }
  return pts;
}

/** 1: a 4-layer neural net (3, 4, 4, 3 grids) with one highlighted path. */
export function shapeNet(N: number, R: Rand): Pt[] {
  const xs = [-1.3, -0.44, 0.44, 1.3],
    ns = [3, 4, 4, 3],
    sp = 0.4;
  type Node = { x: number; y: number; z: number };
  const layers: Node[][] = xs.map((x, l) => {
    const n = ns[l],
      out: Node[] = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        out.push({ x, y: (r - (n - 1) / 2) * sp, z: (c - (n - 1) / 2) * sp });
    return out;
  });
  const path = [4, 5, 10, 4].map((v, l) => Math.min(v, layers[l].length - 1));
  const pts: Pt[] = [];
  layers.forEach((L, l) =>
    L.forEach((n, j) => {
      for (let k = 0; k < 12; k++) {
        const u = R() * 2 - 1,
          th = R() * Math.PI * 2,
          s = Math.sqrt(1 - u * u);
        pts.push({
          x: n.x + Math.cos(th) * s * 0.06,
          y: n.y + u * 0.06,
          z: n.z + Math.sin(th) * s * 0.06,
          a: j === path[l] ? 1 : 0,
        });
      }
    }),
  );
  const edges: [Node, Node, number][] = [];
  for (let l = 0; l < 3; l++) {
    edges.push([layers[l][path[l]], layers[l + 1][path[l + 1]], 1]);
    for (let e = 0; e < 18; e++)
      edges.push([
        layers[l][Math.floor(R() * layers[l].length)],
        layers[l + 1][Math.floor(R() * layers[l + 1].length)],
        0,
      ]);
  }
  const left = Math.max(0, N - pts.length);
  const per = Math.floor(left / edges.length);
  let extra = left - per * edges.length;
  edges.forEach((e) => {
    const m = per + (extra-- > 0 ? 1 : 0);
    for (let k = 0; k < m; k++) {
      const t = (k + 0.5) / m;
      pts.push({
        x: e[0].x + (e[1].x - e[0].x) * t,
        y: e[0].y + (e[1].y - e[0].y) * t,
        z: e[0].z + (e[1].z - e[0].z) * t,
        a: e[2],
      });
    }
  });
  return pts;
}

/** 2: a rover (box body, four wheels, accent lidar puck) inside an accent ground ring. */
export function shapeRover(N: number, R: Rand): Pt[] {
  const pts: Pt[] = [];
  const hx = 0.72,
    hy = 0.15,
    hz = 0.42,
    cy = 0.02;
  const bodyN = Math.round(N * 0.34);
  const areas = [hy * hz, hy * hz, hx * hz, hx * hz, hx * hy, hx * hy];
  const at = areas.reduce((a, b) => a + b, 0);
  for (let i = 0; i < bodyN; i++) {
    let u = R() * at,
      f = 0;
    while (u > areas[f]) {
      u -= areas[f];
      f++;
    }
    const a = R() * 2 - 1,
      b = R() * 2 - 1;
    let p: Pt;
    if (f === 0) p = { x: -hx, y: a * hy, z: b * hz, a: 0 };
    else if (f === 1) p = { x: hx, y: a * hy, z: b * hz, a: 0 };
    else if (f === 2) p = { x: a * hx, y: -hy, z: b * hz, a: 0 };
    else if (f === 3) p = { x: a * hx, y: hy, z: b * hz, a: 0 };
    else if (f === 4) p = { x: a * hx, y: b * hy, z: -hz, a: 0 };
    else p = { x: a * hx, y: b * hy, z: hz, a: 0 };
    p.y += cy;
    pts.push(p);
  }
  const wheelN = Math.round(N * 0.07);
  (
    [
      [-0.48, -0.56],
      [0.48, -0.56],
      [-0.48, 0.56],
      [0.48, 0.56],
    ] as P2[]
  ).forEach((w) => {
    for (let i = 0; i < wheelN; i++) {
      const th = R() * Math.PI * 2;
      let r = 0.26,
        z = (R() - 0.5) * 0.2;
      if (R() < 0.35) {
        z = R() < 0.5 ? -0.1 : 0.1;
        r = 0.26 * (0.55 + R() * 0.45);
      }
      pts.push({ x: w[0] + Math.cos(th) * r, y: -0.18 + Math.sin(th) * r, z: w[1] + z, a: 0 });
    }
  });
  const lidN = Math.round(N * 0.05);
  for (let i = 0; i < lidN; i++) {
    const th = R() * Math.PI * 2;
    pts.push({ x: 0.3 + Math.cos(th) * 0.13, y: 0.22 + R() * 0.12, z: Math.sin(th) * 0.13, a: 1 });
  }
  const left = N - pts.length;
  for (let i = 0; i < left; i++) {
    const th = (i / left) * Math.PI * 2;
    const rad = 1.35 + 0.22 * Math.sin(th * 3) * Math.cos(th * 5) + (R() - 0.5) * 0.04;
    pts.push({ x: Math.cos(th) * rad, y: -0.46, z: Math.sin(th) * rad, a: 1 });
  }
  return pts;
}

/** 3: three stacks of coins (4, 7, 10) and a rising trend line. */
export function shapeCoins(N: number, R: Rand): Pt[] {
  const xs = [-0.85, 0, 0.85],
    counts = [4, 7, 10],
    r = 0.3,
    th = 0.075,
    base = -0.78;
  const coins: { x: number; y: number; z: number }[] = [];
  xs.forEach((x, s) => {
    for (let c = 0; c < counts[s]; c++)
      coins.push({ x: x + (R() - 0.5) * 0.04, y: base + c * th, z: (R() - 0.5) * 0.04 });
  });
  const trendN = Math.round(N * 0.16);
  const per = Math.floor((N - trendN) / coins.length);
  const pts: Pt[] = [];
  coins.forEach((c) => {
    for (let i = 0; i < per; i++) {
      const a = R() * Math.PI * 2;
      if (R() < 0.6)
        pts.push({ x: c.x + Math.cos(a) * r, y: c.y + R() * th, z: c.z + Math.sin(a) * r, a: 0 });
      else {
        const rr = R() < 0.6 ? r : r * 0.72;
        pts.push({ x: c.x + Math.cos(a) * rr, y: c.y + th, z: c.z + Math.sin(a) * rr, a: 0 });
      }
    }
  });
  const tops = counts.map((n) => base + n * th);
  const poly: P2[] = [
    [-1.35, -0.55],
    [-0.85, tops[0] + 0.32],
    [0, tops[1] + 0.32],
    [0.85, tops[2] + 0.32],
    [1.35, tops[2] + 0.72],
  ];
  const segL: number[] = [];
  for (let k = 0; k < poly.length - 1; k++)
    segL.push(Math.hypot(poly[k + 1][0] - poly[k][0], poly[k + 1][1] - poly[k][1]));
  const tot = segL.reduce((a, b) => a + b, 0);
  const left = N - pts.length;
  for (let i = 0; i < left; i++) {
    let u = (i / left) * tot,
      k = 0;
    while (u > segL[k] && k < segL.length - 1) {
      u -= segL[k];
      k++;
    }
    const t = u / segL[k];
    pts.push({
      x: poly[k][0] + (poly[k + 1][0] - poly[k][0]) * t,
      y: poly[k][1] + (poly[k + 1][1] - poly[k][1]) * t + (R() - 0.5) * 0.025,
      z: (R() - 0.5) * 0.04,
      a: 1,
    });
  }
  return pts;
}

/** 7: an open book propped toward the reader; left page written, right page mostly blank. */
export function shapeBook(N: number, R: Rand): Pt[] {
  type P3 = [number, number, number];
  const PH = Math.PI / 3,
    cP = Math.cos(PH),
    sP = Math.sin(PH),
    PW = 1.08,
    VH = 0.7;
  const h = (u: number) => 0.26 * (1 - Math.exp((-4.2 * Math.abs(u)) / PW));
  const P = (u: number, v: number, d = 0): P3 => {
    const hh = h(u) - d;
    return [u, v * sP + hh * cP + 0.04, v * cP - hh * sP];
  };
  const polys: { pts: P3[]; a: number; w: number }[] = [];
  const add = (pts: P3[], a: number, wgt = 1) => polys.push({ pts, a, w: wgt });
  const curve = (u0: number, u1: number, v: number, d: number, a: number, wgt?: number) => {
    const pts: P3[] = [];
    for (let i = 0; i <= 24; i++) pts.push(P(u0 + ((u1 - u0) * i) / 24, v, d));
    add(pts, a, wgt);
  };
  [-1, 1].forEach((sd) => {
    curve(0, sd * PW, VH, 0, 0);
    curve(0, sd * PW, -VH, 0, 0);
    add([P(sd * PW, VH, 0), P(sd * PW, -VH, 0)], 0);
    for (let j = 1; j <= 3; j++) {
      const d = j * 0.035,
        uu = sd * (PW + j * 0.012);
      curve(sd * 0.5, uu, -VH - j * 0.004, d, 0, 0.6);
      add([P(uu, VH, d), P(uu, -VH, d)], 0, 0.6);
    }
  });
  add([P(0, VH, 0), P(0, -VH, 0)], 0);
  // left page: lines of text, ragged right
  for (let r = 0; r < 12; r++) {
    const v = 0.55 - r * 0.1;
    const end = r === 11 ? 0.54 : 0.92 - ((r * 37) % 5) * 0.045;
    curve(-0.14, -end, v, 0, 0, 1.4);
  }
  // right page: three lines, the last still being written
  for (let r = 0; r < 3; r++) {
    const v = 0.55 - r * 0.1;
    const end = r === 2 ? 0.5 : 0.92 - r * 0.07;
    curve(0.14, end, v, 0, r === 2 ? 1 : 0, 1.4);
  }
  // ribbon bookmark from the spine
  add([P(0.04, -VH, 0), P(0.09, -VH - 0.14, 0), P(0.06, -VH - 0.28, 0)], 1, 1.2);
  const segs: { A: P3; B: P3; L: number; a: number }[] = [];
  polys.forEach((Q) => {
    for (let i = 0; i < Q.pts.length - 1; i++) {
      const A = Q.pts[i],
        B = Q.pts[i + 1];
      segs.push({ A, B, L: Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) * Q.w, a: Q.a });
    }
  });
  const tot = segs.reduce((q, g) => q + g.L, 0);
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    let u = R() * tot,
      k = 0;
    while (u > segs[k].L && k < segs.length - 1) {
      u -= segs[k].L;
      k++;
    }
    const g = segs[k],
      f = g.L ? u / g.L : 0;
    pts.push({
      x: g.A[0] + (g.B[0] - g.A[0]) * f + (R() - 0.5) * 0.012,
      y: g.A[1] + (g.B[1] - g.A[1]) * f + (R() - 0.5) * 0.012,
      z: g.A[2] + (g.B[2] - g.A[2]) * f,
      a: g.a,
    });
  }
  return pts;
}

/** Shapes in index order (§10.1). Generated in this order with one RNG. */
export const SHAPES = [
  shapeCode,
  shapeNet,
  shapeRover,
  shapeCoins,
  shapeGallery,
  shapeScatter,
  shapeGalleryAI,
  shapeBook,
] as const;

/** World index → particle shape index (§3.4). */
export const SHAPE_OF = [0, 1, 2, 3, 7] as const;
