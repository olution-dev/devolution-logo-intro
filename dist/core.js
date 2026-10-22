/*
 * Platform-free core of the Devolution logo intro: "dev(arrow)lution." turns
 * into "olution.dev".
 *
 * A renderer lays out both states, measures them into a `Layout`, and asks
 * `frame()` where everything goes at a given moment. The choreography and the
 * arrow's geometry live here, so every renderer plays the same brand motion.
 */
export const TOKENS = ["d", "e", "v", "ring", "l", "u", "t", "i", "o", "n", "dot"];
// Reading order of the end state, "olution.dev".
export const ORDER_B = ["ring", "l", "u", "t", "i", "o", "n", "dot", "d", "e", "v"];
export const DEV = ["d", "e", "v"];
export const CHARS = {
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
export const isBold = (id) => DEV.includes(id);
// The standard arrow (DEVOLUTION-LOGO-ARROW.svg): a 275° clockwise arc starting
// bottom-left, stroke 8 on an 88 outer diameter.
export const ARC_START = 135;
export const ARC = 275;
const STROKE_RATIO = 8 / 88;
export const DEFAULT_TIMING = { intro: 1200, hold: 400, morph: 2000, rest: 600, fade: 700 };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};
export const toRgb = (hex) => {
    const value = hex.trim().replace(/^#/, "");
    const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
    if (!/^[0-9a-f]{6}$/i.test(full))
        throw new Error(`Expected a #rgb or #rrggbb colour, got "${hex}"`);
    return [0, 2, 4].map((n) => parseInt(full.slice(n, n + 2), 16));
};
const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const mix = (a, b, t) => `rgb(${a.map((v, n) => Math.round(lerp(v, b[n], t))).join(",")})`;
// The label's default colour: the text at 65% over the background.
export const mutedText = (text, background) => {
    const [t, b] = [toRgb(text), toRgb(background)];
    return toHex(b.map((v, n) => Math.round(lerp(v, t[n], 0.65))));
};
export const DEFAULT_COLORS = {
    background: "#0a0a0a",
    text: "#f3f1ea",
    accent: "#f6da1e",
    label: mutedText("#f3f1ea", "#0a0a0a"),
};
export const duration = (timing) => timing.intro + timing.hold + timing.morph + timing.rest;
/*
 * Progress at `elapsed` ms: i = intro (letters appear), m = morph, both 0..1.
 * With reduced motion the two states crossfade instead, through `opacity`.
 */
export function progress(elapsed, timing, reducedMotion = false) {
    const { intro, hold, morph } = timing;
    const m = seg(elapsed, intro + hold, intro + hold + morph);
    if (reducedMotion)
        return { i: 1, m: m < 0.5 ? 0 : 1, opacity: Math.abs(1 - 2 * m) };
    return { i: seg(elapsed, 0, intro), m, opacity: 1 };
}
// Letters fade up one after another, in reading order.
const appear = (i, idx, fontSize) => {
    const q = ease.out(seg(i, 0.3 + idx * 0.035, 0.65 + idx * 0.035));
    return { opacity: q, dy: (1 - q) * fontSize * 0.25, blur: (1 - q) * 6 };
};
export function frame(layout, i, m, colors) {
    const { A, B, fontSize: f } = layout;
    const lap = A.ring.x - B.ring.x;
    const slide = seg(m, 0.04, 0.72);
    const shift = lap * ease.inOut(slide);
    const speed = Math.sin(Math.PI * slide); // 0 at rest, 1 mid-slide
    const skew = speed * 12; // lean into the motion
    const pad = f * 0.06;
    const mask = { left: layout.left - pad, right: layout.right + pad, feather: speed * f * 0.35 };
    const glyphs = {};
    const wraps = {};
    TOKENS.forEach((id, idx) => {
        if (id === "ring")
            return;
        const a = appear(i, idx, f);
        const x = A[id].x - shift;
        const dev = isBold(id);
        glyphs[id] = {
            x,
            y: A[id].y + a.dy,
            opacity: dev && slide >= 1 ? 0 : a.opacity,
            blur: a.blur,
            skew,
        };
        if (dev) {
            const loop = B[id].x - (A[id].x - lap); // one full lap
            wraps[id] = { x: x + loop, y: B[id].y, opacity: slide > 0 ? 1 : 0, blur: 0, skew };
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
    const credit = appear(i, 0, f);
    return {
        glyphs,
        wraps,
        mask,
        label: { opacity: credit.opacity, blur: credit.blur, dy: credit.dy * 0.5 },
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
