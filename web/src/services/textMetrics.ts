import { Shape, ShapeGeometry, ShapePath } from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

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

/**
 * Largest font size (≥1.2, in 0.1 steps) whose measured ink box fits inside the
 * given box. This is the "auto" size — and therefore also the manual-size clamp
 * limit — and matches exactly what the STL exporter resolves.
 */
export async function maxFittingSize(text: string, maxW: number, maxH: number): Promise<number> {
  await loadFont();
  const trimmed = text.trim();
  if (!trimmed) return 0;
  let size = Math.max(6, maxH * 1.4);
  const minSize = 1.2;
  while (size > minSize) {
    const b = measureTextBounds(trimmed, size);
    if (b && b.width <= maxW && b.height <= maxH) return size;
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