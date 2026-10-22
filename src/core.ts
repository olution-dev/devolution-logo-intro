/*
 * Platform-free core of the Devolution logo intro: "dev(arrow)lution." turns
 * into "olution.dev".
 *
 * A renderer lays out both states, measures them into a `Layout`, and asks
 * `frame()` where everything goes at a given moment. The choreography and the
 * arrow's geometry live here, so every renderer plays the same brand motion.
 */

export type Point = { x: number; y: number };
export type Rgb = [number, number, number];

export const TOKENS = ["d", "e", "v", "ring", "l", "u", "t", "i", "o", "n", "dot"] as const;
export type TokenId = (typeof TOKENS)[number];

// Reading order of the end state, "olution.dev".
export const ORDER_B: readonly TokenId[] = ["ring", "l", "u", "t", "i", "o", "n", "dot", "d", "e", "v"];

export const DEV = ["d", "e", "v"] as const;
export type DevId = (typeof DEV)[number];

export const CHARS: Record<TokenId, string> = {
  d: "d",
  e: "e",
  v: "v",
  ring: "o",
  l: "l",
  u: "u",
  t: "t",
  i: "i",
  o: "o",
  n: "n",
  dot: ".",
};

export const isBold = (id: TokenId) => (DEV as readonly TokenId[]).includes(id);

// The standard arrow (DEVOLUTION-LOGO-ARROW.svg): a 275° clockwise arc starting
// bottom-left, stroke 8 on an 88 outer diameter.
export const ARC_START = 135;
export const ARC = 275;
const STROKE_RATIO = 8 / 88;

export type Timing = { intro: number; hold: number; morph: number; rest: number; fade: number };
export const DEFAULT_TIMING: Timing = { intro: 1200, hold: 400, morph: 2000, rest: 600, fade: 700 };

export type Colors = { background: string; text: string; accent: string };
export const DEFAULT_COLORS: Colors = { background: "#0a0a0a", text: "#f3f1ea", accent: "#f6da1e" };

/*
 * Measured by the renderer, in its own coordinates:
 * A, B      centre of every glyph box in the start and end states
 * left/right edges of the start-state word
 * oHeight   ink height of the light "o"; oOffset its ink centre below the box centre
 * lWidth    ink width of the light "l", the thin stroke the arrow closes into
 */
export type Layout = {
  fontSize: number;
  A: Record<TokenId, Point>;
  B: Record<TokenId, Point>;
  left: number;
  right: number;
  oHeight: number;
  oOffset: number;
  lWidth: number;
};

export type GlyphFrame = { x: number; y: number; opacity: number; blur: number; skew: number };

export type RingFrame = {
  // ink centre of the ring and the size of the square box it is drawn in
  x: number;
  y: number;
  box: number;
  rotate: number;
  radius: number;
  strokeWidth: number;
  // degrees of the circle drawn, out of 360, starting at ARC_START
  arc: number;
  head: [Point, Point, Point];
  color: string;
  opacity: number;
};

export type Frame = {
  glyphs: Record<TokenId, GlyphFrame>;
  // second copy of "dev" that comes back in after the dot
  wraps: Record<DevId, GlyphFrame>;
  ring: RingFrame;
  // horizontal window the word scrolls through; feather > 0 only while moving
  mask: { left: number; right: number; feather: number };
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};

export const toRgb = (hex: string): Rgb => {
  const value = hex.trim().replace(/^#/, "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Expected a #rgb or #rrggbb colour, got "${hex}"`);
  return [0, 2, 4].map((n) => parseInt(full.slice(n, n + 2), 16)) as Rgb;
};

const mix = (a: Rgb, b: Rgb, t: number) => `rgb(${a.map((v, n) => Math.round(lerp(v, b[n], t))).join(",")})`;

export const duration = (timing: Timing) => timing.intro + timing.hold + timing.morph + timing.rest;

/*
 * Progress at `elapsed` ms: i = intro (letters appear), m = morph, both 0..1.
 * With reduced motion the two states crossfade instead, through `opacity`.
 */
export function progress(elapsed: number, timing: Timing, reducedMotion = false) {
  const { intro, hold, morph } = timing;
  const m = seg(elapsed, intro + hold, intro + hold + morph);
  if (reducedMotion) return { i: 1, m: m < 0.5 ? 0 : 1, opacity: Math.abs(1 - 2 * m) };
  return { i: seg(elapsed, 0, intro), m, opacity: 1 };
}

export function frame(layout: Layout, i: number, m: number, colors: { text: Rgb; accent: Rgb }): Frame {
  const { A, B, fontSize: f } = layout;
  const lap = A.ring.x - B.ring.x;
  const slide = seg(m, 0.04, 0.72);
  const shift = lap * ease.inOut(slide);
  const speed = Math.sin(Math.PI * slide); // 0 at rest, 1 mid-slide
  const skew = speed * 12; // lean into the motion

  const pad = f * 0.06;
  const mask = { left: layout.left - pad, right: layout.right + pad, feather: speed * f * 0.35 };

  const glyphs = {} as Record<TokenId, GlyphFrame>;
  const wraps = {} as Record<DevId, GlyphFrame>;
  TOKENS.forEach((id, idx) => {
    if (id === "ring") return;
    // letters fade up one after another, in reading order
    const q = ease.out(seg(i, 0.3 + idx * 0.035, 0.65 + idx * 0.035));
    const x = A[id].x - shift;
    const dev = isBold(id);
    glyphs[id] = {
      x,
      y: A[id].y + (1 - q) * f * 0.25,
      opacity: dev && slide >= 1 ? 0 : q,
      blur: (1 - q) * 6,
      skew,
    };
    if (dev) {
      const loop = B[id].x - (A[id].x - lap); // one full lap
      wraps[id as DevId] = { x: x + loop, y: B[id].y, opacity: slide > 0 ? 1 : 0, blur: 0, skew };
    }
  });

  // The arrow spins with the slide, closes into a full circle, loses its head,
  // thins and takes the text colour, then hands over to the real "o".
  const close = ease.inOut(seg(m, 0.72, 0.9));
  const handover = ease.inOut(seg(m, 0.88, 0.98));
  const headScale = ease.outBack(seg(i, 0, 0.2)) * (1 - ease.in(seg(m, 0.7, 0.86)));
  const x = A.ring.x - shift;

  const strokeWidth = lerp(layout.oHeight * STROKE_RATIO, layout.lWidth, close);
  const radius = (layout.oHeight - strokeWidth) / 2;
  const arc = ARC * ease.inOut(seg(i, 0, 0.7)) + (360 - ARC) * close;

  const a = ((ARC_START + arc) * Math.PI) / 180;
  const n = [Math.cos(a), Math.sin(a)];
  const tg = [-n[1], n[0]];
  const P = [radius * n[0], radius * n[1]];
  const hw = strokeWidth * 1.25 * Math.max(headScale, 0);
  const hl = strokeWidth * 1.75 * Math.max(headScale, 0);

  glyphs.ring = { x, y: A.ring.y, opacity: handover, blur: 0, skew: 0 };

  return {
    glyphs,
    wraps,
    mask,
    ring: {
      x,
      y: A.ring.y + layout.oOffset,
      box: layout.oHeight * 1.9,
      rotate: ease.inOut(slide) * 720,
      radius,
      strokeWidth,
      arc,
      head: [
        { x: P[0] + n[0] * hw, y: P[1] + n[1] * hw },
        { x: P[0] - n[0] * hw, y: P[1] - n[1] * hw },
        { x: P[0] + tg[0] * hl, y: P[1] + tg[1] * hl },
      ],
      color: mix(colors.accent, colors.text, close),
      opacity: 1 - handover,
    },
  };
}
