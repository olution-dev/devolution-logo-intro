/*
 * DOM renderer for the logo intro.
 *
 * Both states are laid out in hidden rows and measured; the visible letters are
 * positioned absolutely and moved by `frame()` from the core. The container
 * fades out when the intro ends and is then removed.
 */
import { ARC_START, CHARS, DEFAULT_COLORS, DEFAULT_TIMING, DEV, ORDER_B, TOKENS, duration, frame, isBold, progress, toRgb, } from "./core.js";
const SVG = "http://www.w3.org/2000/svg";
const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchmove"];
export function playLogoIntro(container, options = {}) {
    const timing = { ...DEFAULT_TIMING, ...options.timing };
    const colors = { ...DEFAULT_COLORS, ...options.colors };
    const fontFamily = options.fontFamily ?? '"Quicksand", ui-rounded, system-ui, sans-serif';
    const fontSize = options.fontSize ?? "clamp(44px, 11vw, 150px)";
    const reducedMotion = options.reducedMotion ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
    let resolve;
    const finished = new Promise((r) => (resolve = r));
    let ended = false;
    let raf = 0;
    let resize;
    const cleanup = () => {
        cancelAnimationFrame(raf);
        resize?.disconnect();
        SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip));
    };
    // Ends the intro: fades the container out, or drops it at once if something broke.
    function end(failed = false) {
        if (ended)
            return;
        ended = true;
        cleanup();
        const remove = () => {
            container.remove();
            resolve();
        };
        if (failed) {
            remove();
        }
        else {
            container.style.pointerEvents = "none";
            container.style.transition = `opacity ${timing.fade}ms ease-out`;
            container.style.opacity = "0";
            window.setTimeout(remove, timing.fade);
        }
        options.onFinish?.();
    }
    const skip = () => end();
    try {
        start();
    }
    catch {
        // never leave the page covered
        end(true);
    }
    return { finished, skip };
    function start() {
        const text = toRgb(colors.text);
        const accent = toRgb(colors.accent);
        container.replaceChildren();
        container.style.background = colors.background;
        container.style.overflow = "hidden";
        if (getComputedStyle(container).position === "static")
            container.style.position = "relative";
        const rows = el("div", {
            position: "absolute",
            inset: "0",
            display: "grid",
            placeItems: "center",
            visibility: "hidden",
            pointerEvents: "none",
        });
        const row = () => rows.appendChild(el("div", { gridArea: "1 / 1", display: "flex", alignItems: "baseline" }));
        const rowA = row();
        const rowB = row();
        // hidden until the first frame is drawn
        const layer = el("div", { position: "absolute", inset: "0", opacity: "0" });
        container.append(rows, layer);
        const svg = document.createElementNS(SVG, "svg");
        Object.assign(svg.style, { position: "absolute", top: "0", left: "0", overflow: "visible", willChange: "transform" });
        const circle = document.createElementNS(SVG, "circle");
        circle.setAttribute("pathLength", "360");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke-linecap", "round");
        circle.setAttribute("transform", `rotate(${ARC_START})`);
        const head = document.createElementNS(SVG, "polygon");
        svg.append(circle, head);
        layer.append(svg);
        const glyph = (id, positioned = false) => {
            const node = el("span", {
                display: "block",
                fontFamily,
                fontSize,
                fontWeight: isBold(id) ? "700" : "300",
                lineHeight: "1",
                whiteSpace: "pre",
                color: colors.text,
                ...(positioned && { position: "absolute", top: "0", left: "0", willChange: "transform" }),
            });
            node.textContent = CHARS[id];
            return node;
        };
        const slotA = {};
        const slotB = {};
        const glyphs = {};
        for (const id of TOKENS) {
            slotA[id] = rowA.appendChild(glyph(id));
            glyphs[id] = layer.appendChild(glyph(id, true));
        }
        for (const id of ORDER_B)
            slotB[id] = rowB.appendChild(glyph(id));
        // second copy of "dev" that enters from the right edge
        const wraps = Object.fromEntries(DEV.map((id) => [id, layer.appendChild(glyph(id, true))]));
        // ---------- measurement ----------
        const ctx = document.createElement("canvas").getContext("2d");
        // Ink metrics of a glyph in a `line-height: 1` box: vertical offset of the ink
        // centre from the box centre, ink height and ink width.
        const ink = (weight, size, ch) => {
            ctx.font = `${weight} ${size}px ${fontFamily}`;
            const m = ctx.measureText(ch);
            const baseline = (size - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
            const mid = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
            return {
                off: mid - size / 2,
                h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
                w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
            };
        };
        let layout;
        function measure() {
            const s = container.getBoundingClientRect();
            const centres = (slots) => {
                const out = {};
                for (const id of TOKENS) {
                    const r = slots[id].getBoundingClientRect();
                    out[id] = { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
                }
                return out;
            };
            const f = parseFloat(getComputedStyle(slotA.d).fontSize);
            const o = ink(300, f, "o");
            const r = rowA.getBoundingClientRect();
            layout = {
                fontSize: f,
                A: centres(slotA),
                B: centres(slotB),
                left: r.left - s.left,
                right: r.right - s.left,
                oHeight: o.h,
                oOffset: o.off,
                lWidth: ink(300, f, "l").w,
            };
        }
        // ---------- drawing ----------
        const place = (node, g) => {
            node.style.transform = `translate(${g.x}px, ${g.y}px) translate(-50%, -50%) skewX(${g.skew}deg)`;
            node.style.opacity = String(g.opacity);
            node.style.filter = g.blur > 0.05 ? `blur(${g.blur}px)` : "none";
        };
        function draw(elapsed) {
            const p = progress(elapsed, timing, reducedMotion);
            const fr = frame(layout, p.i, p.m, { text, accent });
            const { left: L, right: R, feather: fw } = fr.mask;
            layer.style.maskImage = `linear-gradient(90deg, transparent ${L}px, #000 ${L + fw}px, #000 ${R - fw}px, transparent ${R}px)`;
            layer.style.opacity = String(p.opacity);
            for (const id of TOKENS)
                place(glyphs[id], fr.glyphs[id]);
            for (const id of DEV)
                place(wraps[id], fr.wraps[id]);
            const ring = fr.ring;
            svg.setAttribute("viewBox", `${-ring.box / 2} ${-ring.box / 2} ${ring.box} ${ring.box}`);
            svg.style.width = svg.style.height = `${ring.box}px`;
            svg.style.transform = `translate(${ring.x - ring.box / 2}px, ${ring.y - ring.box / 2}px) rotate(${ring.rotate}deg)`;
            svg.style.opacity = String(ring.opacity);
            circle.setAttribute("r", String(ring.radius));
            circle.setAttribute("stroke-width", String(ring.strokeWidth));
            circle.setAttribute("stroke", ring.color);
            circle.setAttribute("stroke-dasharray", `${ring.arc} ${360 - ring.arc + 0.01}`);
            head.setAttribute("fill", ring.color);
            head.setAttribute("points", ring.head.map((pt) => `${pt.x},${pt.y}`).join(" "));
        }
        // ---------- timeline ----------
        const total = duration(timing);
        let elapsed = 0;
        let last = null;
        function tick(now) {
            try {
                // Clamp dt so a backgrounded tab resumes where it left off instead of jumping.
                elapsed += last === null ? 0 : Math.min(now - last, 50);
                last = now;
                draw(elapsed);
                if (elapsed >= total)
                    return end();
                raf = requestAnimationFrame(tick);
            }
            catch {
                end(true);
            }
        }
        if (options.skippable ?? true) {
            SKIP_EVENTS.forEach((type) => window.addEventListener(type, skip, { passive: true }));
        }
        // Wait for the logo font; if it's slow, skip the intro rather than hold the page.
        const fonts = Promise.all([document.fonts.load(`700 100px ${fontFamily}`), document.fonts.load(`300 100px ${fontFamily}`)]);
        const timeout = new Promise((_, reject) => window.setTimeout(reject, options.fontTimeout ?? 1500));
        Promise.race([fonts, timeout]).then(() => {
            if (ended)
                return;
            try {
                measure();
                draw(elapsed);
                resize = new ResizeObserver(() => {
                    measure();
                    draw(elapsed);
                });
                resize.observe(container);
                raf = requestAnimationFrame(tick);
            }
            catch {
                end(true);
            }
        }, () => end());
    }
}
function el(tag, style) {
    const node = document.createElement(tag);
    Object.assign(node.style, style);
    return node;
}
