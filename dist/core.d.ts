export type Point = {
    x: number;
    y: number;
};
export type Rgb = [number, number, number];
export declare const TOKENS: readonly ["d", "e", "v", "ring", "l", "u", "t", "i", "o", "n", "dot"];
export type TokenId = (typeof TOKENS)[number];
export declare const ORDER_B: readonly TokenId[];
export declare const DEV: readonly ["d", "e", "v"];
export type DevId = (typeof DEV)[number];
export declare const CHARS: Record<TokenId, string>;
export declare const isBold: (id: TokenId) => boolean;
export declare const ARC_START = 122.9;
export declare const ARC = 287.1;
export type Timing = {
    intro: number;
    hold: number;
    morph: number;
    rest: number;
    fade: number;
};
export declare const DEFAULT_TIMING: Timing;
export type Layout = {
    fontSize: number;
    A: Record<TokenId, Point>;
    B: Record<TokenId, Point>;
    left: number;
    right: number;
    oHeight: number;
    oOffset: number;
    lWidth: number;
    label: Point;
};
export type GlyphFrame = {
    x: number;
    y: number;
    opacity: number;
    blur: number;
    skew: number;
};
export type RingFrame = {
    x: number;
    y: number;
    box: number;
    rotate: number;
    radius: number;
    strokeWidth: number;
    arc: number;
    head: [Point, Point, Point];
    color: string;
    opacity: number;
};
export type Frame = {
    glyphs: Record<TokenId, GlyphFrame>;
    wraps: Record<DevId, GlyphFrame>;
    ring: RingFrame;
    label: {
        opacity: number;
        blur: number;
        dy: number;
    };
    mask: {
        left: number;
        right: number;
        feather: number;
    };
};
export declare const toRgb: (hex: string) => Rgb;
export declare const mutedText: (text: string, background: string) => string;
export type Colors = {
    background: string;
    text: string;
    accent: string;
    label: string;
};
export declare const DEFAULT_COLORS: Colors;
export declare const duration: (timing: Timing) => number;
export declare function progress(elapsed: number, timing: Timing, reducedMotion?: boolean): {
    i: number;
    m: number;
    opacity: number;
};
export declare function frame(layout: Layout, i: number, m: number, colors: {
    text: Rgb;
    accent: Rgb;
}): Frame;
