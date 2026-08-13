import type { CustomIconMeta } from "../types/label";

const STORAGE_KEY = "gflg.customIcons";

/**
 * Computes a content crop viewBox ("x y w h") for an arbitrary SVG by measuring
 * the actual graphics bounding box in the browser (getBBox), then adding a small
 * padding. Robust for Inkscape/A4 SVGs whose viewBox spans the whole canvas.
 * Falls back to the SVG's own viewBox if measurement fails.
 */
export function computeSvgViewBox(svgString: string): string {
  try {
    const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
    const root = doc.documentElement;
    if (!root) throw new Error("no root");

    const ns = "http://www.w3.org/2000/svg";
    const container = document.createElementNS(ns, "svg");
    container.setAttribute("width", "400");
    container.setAttribute("height", "400");
    container.style.cssText =
      "position:absolute;left:-10000px;top:0;width:400px;height:400px;visibility:hidden;pointer-events:none";
    document.body.appendChild(container);

    // Detach the source root so getBBox reports the svg's *own* user units
    // regardless of any parent layout/scaling.
    const imported = document.importNode(root, true) as unknown as SVGSVGElement;
    container.appendChild(imported);

    let b = imported.getBBox();
    // Some inliners nest the real content in a <g>: measure that too if empty.
    if ((!b || b.width <= 0) && imported.firstElementChild) {
      b = (imported.firstElementChild as SVGGraphicsElement).getBBox();
    }

    document.body.removeChild(container);

    if (b && b.width > 0 && b.height > 0 && Number.isFinite(b.x) && Number.isFinite(b.y)) {
      const pad = Math.max(b.width, b.height) * 0.02;
      const x = b.x - pad;
      const y = b.y - pad;
      const w = b.width + pad * 2;
      const h = b.height + pad * 2;
      return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
    }
  } catch {
    // fall through to fallbacks
  }

  try {
    const root = new DOMParser().parseFromString(svgString, "image/svg+xml").documentElement;
    const vb = root.getAttribute("viewBox");
    if (vb) return vb;
  } catch {
    // ignore
  }
  return "0 0 793 1122"; // A4-canvas guess
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
    // storage full / unavailable — ignore (icons stay session-only)
  }
}

export function addCustomIcon(icons: CustomIconMeta[], svgString: string, name: string): CustomIconMeta[] {
  const viewBox = computeSvgViewBox(svgString);
  const meta: CustomIconMeta = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Custom icon",
    svg: svgString,
    viewBox,
  };
  const next = [...icons, meta];
  saveCustomIcons(next);
  return next;
}

export function removeCustomIcon(icons: CustomIconMeta[], id: string): CustomIconMeta[] {
  const next = icons.filter((i) => i.id !== id);
  saveCustomIcons(next);
  return next;
}