import type { CustomIconMeta } from "../types/label";

const STORAGE_KEY = "gflg.customIcons";

// The picker/preview render every icon as a fixed A4-sized <image> and crop with
// an outer viewBox that lives in that A4 ("793.7 × 1122.5") coordinate space.
// Imported SVGs arrive in arbitrary user units, so we normalise them into that
// A4 space at import time: the returned svg is rewrapped so its content sits on
// the A4 canvas, and the returned viewBox crops exactly to it. The STL/Three.js
// path ignores viewBox (it auto-fits the real path geometry), so it is unaffected.
const A4_W = 793.70079;
const A4_H = 1122.5197;

/**
 * Measures the content bounding box of an SVG in its own user units by temporary
 * DOM insertion + getBBox (robust for Inkscape/A4 canvases and small icons alike).
 */
function measureContentBox(svgString: string): { x: number; y: number; w: number; h: number } {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const root = doc.documentElement;

  const ns = "http://www.w3.org/2000/svg";
  const container = document.createElementNS(ns, "svg");
  container.style.cssText =
    "position:absolute;left:-10000px;top:0;width:400px;height:400px;visibility:hidden;pointer-events:none";
  let box = { x: 0, y: 0, w: 0, h: 0 };
  try {
    document.body.appendChild(container);
    const imported = document.importNode(root, true) as unknown as SVGSVGElement;
    container.appendChild(imported);
    let b = imported.getBBox();
    // Some SVGs nest the real drawing in a <g> whose own bbox is empty.
    if ((!b || b.width <= 0) && imported.firstElementChild) {
      b = (imported.firstElementChild as SVGGraphicsElement).getBBox();
    }
    if (b && b.width > 0 && b.height > 0 && Number.isFinite(b.x) && Number.isFinite(b.y)) {
      box = { x: b.x, y: b.y, w: b.width, h: b.height };
    }
  } catch {
    // fall through to the source viewBox below
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }
  if (box.w > 0) return box;
  // Fallback: fit to the source's own viewBox (or a sensible default).
  try {
    const vb = root.getAttribute("viewBox");
    if (vb) {
      const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
      if (w > 0 && h > 0) return { x, y, w, h };
    }
  } catch {
    // ignore
  }
  return { x: 0, y: 0, w: 24, h: 24 };
}

/**
 * Rewraps an imported SVG into the fixed A4 coordinate space the UI expects,
 * centering the content (preserving aspect ratio, with padding) on the A4 canvas.
 * Returns the rewritten SVG plus the corresponding content-crop viewBox.
 */
export function normalizeImportedSvg(svgString: string): { svg: string; viewBox: string } {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid SVG markup");
  }
  const root = doc.documentElement;

  const { x: bx, y: by, w: bw, h: bh } = measureContentBox(svgString);

  const pad = Math.max(bw, bh) * 0.02;
  const scale = Math.min((A4_W - 2 * pad) / Math.max(bw, 1), (A4_H - 2 * pad) / Math.max(bh, 1));
  const gW = bw * scale;
  const gH = bh * scale;
  const tx = (A4_W - gW) / 2;
  const ty = (A4_H - gH) / 2;

  const ns = "http://www.w3.org/2000/svg";
  const wrap = document.createElementNS(ns, "svg");
  wrap.setAttribute("xmlns", ns);
  wrap.setAttribute("viewBox", `0 0 ${A4_W} ${A4_H}`);
  // Explicit intrinsic size matching the viewBox, so the fixed-A4 <image> renders
  // the canvas 1:1 (the built-in A4 SVGs carry the same width/height/viewBox).
  wrap.setAttribute("width", String(A4_W));
  wrap.setAttribute("height", String(A4_H));
  const group = document.createElementNS(ns, "g");
  // Subtract the content origin (bx,by) so the drawing lands inside the centred
  // box; otherwise content offset from (0,0) gets shifted right/down past the
  // A4 canvas edge and appears clipped / off-centre.
  group.setAttribute("transform", `translate(${tx - bx * scale} ${ty - by * scale}) scale(${scale})`);
  // Drop the source root's own transform/viewBox by importing only its children.
  for (const child of Array.from(root.childNodes)) {
    group.appendChild(wrap.ownerDocument.importNode(child, true));
  }
  wrap.appendChild(group);

  const svg = new XMLSerializer().serializeToString(wrap);
  // Crop the A4 canvas exactly to the centred content box. No breathing room:
  // the STL exporter fits the pure path geometry, so an extra margin here would
  // make the preview render imported icons slightly smaller than the emboss.
  const viewBox = `${tx.toFixed(2)} ${ty.toFixed(2)} ${gW.toFixed(2)} ${gH.toFixed(2)}`;
  return { svg, viewBox };
}

export function loadCustomIcons(): CustomIconMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomIcons(icons: CustomIconMeta[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
  } catch {
    // Storage full / unavailable — icons stay session-only.
  }
}

export function buildCustomIcon(svgString: string, name: string): CustomIconMeta {
  const { svg, viewBox } = normalizeImportedSvg(svgString);
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Custom icon",
    svg,
    viewBox,
  };
}

export function removeCustomIcon(icons: CustomIconMeta[], id: string): CustomIconMeta[] {
  return icons.filter((i) => i.id !== id);
}