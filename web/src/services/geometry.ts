import type { HAlign, TextFormat, VAlign } from "../types/label";

/** A single Gridfinity tile is 37.8 mm wide; each additional tile adds 42 mm. */
const TILE_WIDTH = 37.8;
const TILE_STEP = 42;

export const DEFAULT_TEXT_FORMAT: TextFormat = {
  autoSize: true,
  hAlign: "center",
  vAlign: "center",
};

export function labelPhysicalWidth(labelWidth: number): number {
  return TILE_WIDTH + (labelWidth - 1) * TILE_STEP;
}

/** Extra millimetres added to the label for a 2×/3× width. */
export function labelExtraWidth(labelWidth: number): number {
  return (labelWidth - 1) * TILE_STEP;
}

/**
 * Extends a text box's right edge by `extraWidth` (label grows to the right;
 * the icon/left column keeps its size). Used to give 2×/3× labels genuinely
 * more text space instead of just centring fixed-size content.
 */
export function extendRectRight(
  rect: { x1: number; y1: number; x2: number; y2: number },
  extraWidth: number
): { x1: number; y1: number; x2: number; y2: number } {
  return { ...rect, x2: rect.x2 + extraWidth };
}

/** X-offset that places a box of width textW inside a box of width boxW. */
export function hAlignOffset(h: HAlign, boxW: number, textW: number): number {
  switch (h) {
    case "left":
      return 0;
    case "right":
      return boxW - textW;
    default:
      return (boxW - textW) / 2;
  }
}

/**
 * Y-offset that places a block of height `textH` inside a box of height boxH.
 * `yUp`: true → 3D/STL coordinate (Y grows upward); false → SVG (Y grows downward).
 */
export function vAlignOffset(v: VAlign, boxH: number, textH: number, yUp: boolean): number {
  const center = (boxH - textH) / 2;
  if (yUp) {
    switch (v) {
      case "top":
        return boxH - textH;
      case "bottom":
        return 0;
      default:
        return center;
    }
  }
  switch (v) {
    case "top":
      return 0;
    case "bottom":
      return boxH - textH;
    default:
      return center;
  }
}

/** Clamp a manually typed font size into [min, max] so it never overflows the label. */
export function clampManualSize(size: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(size * 10) / 10));
}

// ---- Preview/text box layout (shared by the preview and the manual-size cap) ----
// These are the SVG-preview box definitions (mm). The STL exporter keeps its own
// equivalent set — keep the two in sync when a line's box changes.

export interface Box2 {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ICON_BOX = { x: 3.0, y: 1.0, w: 9.5, h: 9.5 };
const LINE1_BASE = { x: 13.5, y: 1.0, w: 21.3, h: 4.25 }; // top half
const LINE2_BASE = { x: 13.5, y: 6.25, w: 21.3, h: 4.25 }; // bottom half
const FULL_L1_BASE = { x: 3.0, y: 1.0, w: 31.8, h: 4.25 };
const FULL_L2_BASE = { x: 3.0, y: 6.25, w: 31.8, h: 4.25 };
// When only one text line is used it may span the label's full height
const SINGLE_BASE = { x: 13.5, y: 1.0, w: 21.3, h: 9.5 };
const FULL_SINGLE_BASE = { x: 3.0, y: 1.0, w: 31.8, h: 9.5 };

function widenBox(b: Box2, extra: number): Box2 {
  return { ...b, w: b.w + extra }; // label grows to the right; icon column stays fixed
}

/**
 * Resolves the effective rendering box for line 1 and line 2 of a label.
 * `extra` width from 2×/3× is given to the text boxes; a missing line2/line1 gets
 * the full-height single box. Used to size text and to bound the manual size input.
 */
export function resolveLineBoxes(
  labelWidth: number,
  hasIcon: boolean,
  hasLine1: boolean,
  hasLine2: boolean
): { line1: Box2; line2: Box2 } {
  const extra = labelExtraWidth(labelWidth);
  const l1 = widenBox(LINE1_BASE, extra);
  const l2 = widenBox(LINE2_BASE, extra);
  const f1 = widenBox(FULL_L1_BASE, extra);
  const f2 = widenBox(FULL_L2_BASE, extra);
  const s = widenBox(SINGLE_BASE, extra);
  const fs = widenBox(FULL_SINGLE_BASE, extra);
  const line1 = !hasLine2 ? (hasIcon ? s : fs) : hasIcon ? l1 : f1;
  const line2 = !hasLine1 ? (hasIcon ? s : fs) : hasIcon ? l2 : f2;
  return { line1, line2 };
}