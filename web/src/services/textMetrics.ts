import { Shape, ShapeGeometry, ShapePath } from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import type { ImageAsset } from "../types/label";
import { assetAspect, resolveImage } from "./imageRegistry";

// Tighter letter spacing: each glyph's horizontal advance is reduced by this
// factor. MUST match the exporter's value — the preview measures with the same
// glyphs so the auto/manual size it reports equals the size the STL actually uses.
const TRACKING = 0.95;

let _fontPromise: Promise<Font> | null = null;
let font: Font | null = null;

/** Loads (once) the helvetiker_bold typeface used for STL text. */
function loadFont(): Promise<Font> {
  if (!_fontPromise) {
    const base = import.meta.env.BASE_URL;
    _fontPromise = fetch(`${base}helvetiker_bold.typeface.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load font");
        return r.json();
      })
      .then((data) => {
        font = new FontLoader().parse(data);
        return font;
      })
      // Don't cache a failure for the whole session — allow a later retry.
      .catch((e) => {
        _fontPromise = null;
        throw e;
      });
  }
  return _fontPromise;
}

/** Resolve once the STL font is available (the exporter awaits this too). */
export function ensureTextFont(): Promise<void> {
  return loadFont().then(() => undefined);
}

/**
 * Generates Three.js shapes for `text` at `size` with reduced letter spacing.
 * Replicates Three.js FontLoader's internal createPaths logic so we can apply a
 * custom tracking multiplier to each glyph's horizontal advance (ha). Identical
 * to the exporter's generator — keep both in sync.
 */
export function generateShapesWithTracking(text: string, size: number): Shape[] {
  if (!font) throw new Error("Font not loaded: await ensureTextFont() first");
  const data = (font as any).data as {
    resolution: number;
    glyphs: Record<string, { ha: number; o?: string; _cachedOutline?: string[] }>;
  };
  const scale = size / data.resolution;
  const shapes: Shape[] = [];
  let offsetX = 0;

  for (const char of text) {
    const glyph = data.glyphs[char] ?? data.glyphs["?"];
    if (!glyph) continue;

    if (glyph.o) {
      const path = new ShapePath();
      const outline = glyph._cachedOutline ?? (glyph._cachedOutline = glyph.o.split(" "));
      let i = 0;
      while (i < outline.length) {
        const action = outline[i++];
        if (action === "m") {
          path.moveTo(+outline[i++] * scale + offsetX, +outline[i++] * scale);
        } else if (action === "l") {
          path.lineTo(+outline[i++] * scale + offsetX, +outline[i++] * scale);
        } else if (action === "q") {
          // typeface.json order: end x/y then control x/y
          const ex = +outline[i++] * scale + offsetX, ey = +outline[i++] * scale;
          const cx = +outline[i++] * scale + offsetX, cy = +outline[i++] * scale;
          path.quadraticCurveTo(cx, cy, ex, ey);
        } else if (action === "b") {
          const ex  = +outline[i++] * scale + offsetX, ey  = +outline[i++] * scale;
          const c1x = +outline[i++] * scale + offsetX, c1y = +outline[i++] * scale;
          const c2x = +outline[i++] * scale + offsetX, c2y = +outline[i++] * scale;
          path.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        }
      }
      shapes.push(...path.toShapes(false));
    }

    offsetX += glyph.ha * scale * TRACKING;
  }

  return shapes;
}

/** Ink bounding box of `text` at `size` (needs the font loaded). */
export function measureTextBounds(
  text: string,
  size: number
): { x: number; y: number; width: number; height: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const shapes = generateShapesWithTracking(trimmed, size);
  if (shapes.length === 0) return null;
  const geometry = new ShapeGeometry(shapes);
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  if (!b) return null;
  return {
    x: b.min.x,
    y: b.min.y,
    width: b.max.x - b.min.x,
    height: b.max.y - b.min.y,
  };
}

// ---------------------------------------------------------------------------
// Template lines with embedded images ("M3 ${Button Head}").
// A line is a sequence of text runs and `${Name}` image references. Images are
// sized to the line's font size (so they read as tall as the glyphs), keep
// their aspect ratio, and are placed inline. Whitespace is preserved exactly
// (spaces advance like real glyphs). The preview and STL share this module so
// their layout is identical.
// ---------------------------------------------------------------------------

/** Inline image height as a fraction of the line's font size. */
export const ICON_HEIGHT_FACTOR = 1.0;

/** A raw segment of a template line, before resolving against the registry. */
export type LineToken = { type: "text"; text: string } | { type: "ref"; name: string };

/** A resolved segment used for measuring/layout. */
export type ComposedSegment =
  | { type: "text"; text: string }
  | { type: "image"; asset: ImageAsset };

/**
 * Splits a line string into text and `${Name}` reference tokens, preserving all
 * whitespace on text chunks verbatim (multiple spaces stay multiple spaces).
 */
export function parseLineTemplate(line: string): LineToken[] {
  const tokens: LineToken[] = [];
  const re = /\$\{([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (text.length > 0) tokens.push({ type: "text", text });
    const name = m[1].trim();
    if (name) tokens.push({ type: "ref", name });
    last = re.lastIndex;
  }
  const text = line.slice(last);
  if (text.length > 0) tokens.push({ type: "text", text });
  return tokens;
}

/**
 * Resolves raw tokens against an image registry. Known `${Name}` refs become
 * image segments; unknown ones are kept as literal text so a typo is visible
 * instead of silently dropping the reference.
 */
function resolveTokens(tokens: LineToken[], registry: ImageAsset[]): ComposedSegment[] {
  const segs: ComposedSegment[] = [];
  for (const t of tokens) {
    if (t.type === "text") {
      segs.push({ type: "text", text: t.text });
    } else {
      const asset = resolveImage(t.name, registry);
      if (asset) segs.push({ type: "image", asset });
      else segs.push({ type: "text", text: "${" + t.name + "}" });
    }
  }
  return segs;
}

/** Horizontal advance of one space character at `size` (needs font loaded). */
function spaceAdvanceAt(size: number): number {
  const data = (font as any)?.data;
  const space = data?.glyphs?.[" "];
  if (!space) return 0;
  return space.ha * (size / data.resolution) * TRACKING;
}

/** Horizontal advance of `count` space characters at `size`. */
function spaceAdvance(count: number, size: number): number {
  return spaceAdvanceAt(size) * count;
}

/** Positioned token produced by layoutComposed. */
export interface ComposedLayoutToken {
  type: "text" | "image";
  text?: string;
  asset?: ImageAsset;
  /**
   * Horizontal advance in mm (spaces included) — the reader moves this far
   * past the token. For text this includes any leading/trailing spaces; the
   * ink box only covers the visible glyphs (`prePad` shifts it into place).
   */
  width: number;
  /** Height in mm (text ink height, or image box height). Used to centre. */
  height: number;
  /** y-up ink bounds of the visible text (null for images / spaces-only runs). */
  ink: { x: number; y: number; width: number; height: number } | null;
  /** Leading space advance (mm) that pushes the visible glyphs right. */
  prePad: number;
}

/** Result of laying out a composed line at a given font size. */
export interface ComposedLayout {
  tokens: ComposedLayoutToken[];
  /** Total width (advance-based, incl. spaces) used for alignment/fit. */
  totalWidth: number;
  /** Max token height (text ink or image box); tokens are centred on it. */
  contentHeight: number;
}

/**
 * Measures the composed line at `size`: text via the real glyph ink (with
 * interior spaces counted as their advance) and images as font-size boxes with
 * their aspect ratio. Leading/trailing text spaces still advance (so copied
 * spacing, e.g. "M3 ${X}", keeps its gap) but are not part of the ink box.
 */
export function layoutComposed(
  tokens: LineToken[],
  size: number,
  registry: ImageAsset[]
): ComposedLayout {
  const segs = resolveTokens(tokens, registry);
  const tokensOut: ComposedLayoutToken[] = [];
  let contentHeight = 0;
  let runningW = 0;
  for (const seg of segs) {
    if (seg.type === "text") {
      const trimmedStart = seg.text.trimStart();
      const trimmed = seg.text.trim();
      // Leading/trailing space counts must not overlap (a spaces-only run like
      // " " between two icons has leading==len, trailing==0, not 2 spaces).
      const leading = seg.text.length - trimmedStart.length;
      const trailing = trimmedStart.length - trimmed.length;
      const prePad = spaceAdvance(leading, size);
      const postPad = spaceAdvance(trailing, size);
      // Font-safe: before the typeface loads we can't measure glyphs, so fall
      // back to a rough estimate (still fine for the icon-row width, which is
      // typically icons-only; exact measurement follows once the font is ready).
      let ink: { x: number; y: number; width: number; height: number } | null = null;
      if (trimmed) {
        if (font) ink = measureTextBounds(trimmed, size);
        else ink = { x: 0, y: 0, width: trimmed.length * size * 0.6, height: size * 0.9 };
      }
      const width = prePad + (ink ? ink.width : 0) + postPad;
      runningW += width;
      contentHeight = Math.max(contentHeight, ink ? ink.height : 0);
      tokensOut.push({ type: "text", text: seg.text, width, height: ink ? ink.height : 0, ink, prePad });
    } else {
      const aspect = assetAspect(seg.asset);
      const h = size * ICON_HEIGHT_FACTOR;
      const w = h * aspect;
      runningW += w;
      contentHeight = Math.max(contentHeight, h);
      tokensOut.push({ type: "image", asset: seg.asset, width: w, height: h, ink: null, prePad: 0 });
    }
  }
  return { tokens: tokensOut, totalWidth: runningW, contentHeight };
}

/**
 * Largest font size (≥1.2, 0.1 steps) whose composed line (text + embedded
 * images, spaces included) fits inside the box. This is the "auto" size for a
 * template line and the manual-size clamp limit — the STL and preview both use it.
 */
export async function maxFittingSizeComposed(
  tokens: LineToken[],
  maxW: number,
  maxH: number,
  registry: ImageAsset[]
): Promise<number> {
  await loadFont();
  if (tokens.length === 0) return 0;
  let size = Math.max(6, maxH * 1.4);
  const minSize = 1.2;
  while (size > minSize) {
    const lo = layoutComposed(tokens, size, registry);
    if (lo.totalWidth <= maxW && lo.contentHeight <= maxH) return size;
    size -= 0.1;
  }
  return minSize;
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

interface SvgCurve {
  type: string;
  v?: { x: number; y: number };
  v0?: { x: number; y: number };
  v1?: { x: number; y: number };
  v2?: { x: number; y: number };
  v3?: { x: number; y: number };
}

/** Serializes one contour (a shape's outline or a hole) into SVG segments, Y flipped. */
function contourToSvgPath(curves: SvgCurve[]): string {
  if (curves.length === 0) return "";
  const first = curves[0];
  let start: { x: number; y: number } | undefined;
  if (first.type === "LineCurve") start = first.v1;
  else if (first.type === "QuadraticBezierCurve" || first.type === "CubicBezierCurve") start = first.v0;
  else if (first.type === "MoveToCurve") start = first.v;
  if (!start) return "";

  let d = `M${fmt(start.x)} ${fmt(-start.y)}`;
  for (const c of curves) {
    switch (c.type) {
      case "LineCurve":
        d += `L${fmt(c.v2!.x)} ${fmt(-c.v2!.y)}`;
        break;
      case "QuadraticBezierCurve":
        d += `Q${fmt(c.v1!.x)} ${fmt(-c.v1!.y)} ${fmt(c.v2!.x)} ${fmt(-c.v2!.y)}`;
        break;
      case "CubicBezierCurve":
        d += `C${fmt(c.v1!.x)} ${fmt(-c.v1!.y)} ${fmt(c.v2!.x)} ${fmt(-c.v2!.y)} ${fmt(c.v3!.x)} ${fmt(-c.v3!.y)}`;
        break;
      default:
        break; // helvetiker outlines only use line/quadratic/cubic
    }
  }
  return d;
}

/** Serializes one Shape's outline (and holes) into an SVG path, Y flipped for SVG. */
function shapeToSvgPath(shape: Shape): string {
  let d = contourToSvgPath(shape.curves as unknown as SvgCurve[]);
  for (const hole of shape.holes) d += contourToSvgPath(hole.curves as unknown as SvgCurve[]);
  return d;
}

/**
 * Renders `text` at `size` as an SVG <path> filled from the actual helvetiker
 * glyph outlines (with the same tracking as the STL). This makes the preview an
 * exact mirror of the exported STL text instead of an approximation via a system
 * font. Y is flipped (SVG grows downward) so it renders upright in an <svg>.
 */
export function textToSvgPath(text: string, size: number): string {
  const shapes = generateShapesWithTracking(text.trim(), size);
  return shapes.map(shapeToSvgPath).join(" ");
}