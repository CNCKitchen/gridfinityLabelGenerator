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

const ICON_AREA_X = 3.0; // left edge of the (large) symbol/icon row
const TEXT_ICON_GAP = 1.0; // gap between the icon row and the text lines
const TEXT_RIGHT_EDGE = 34.8; // right edge all text boxes share (37.8 - right margin)

function widenBox(b: Box2, extra: number): Box2 {
  return { ...b, w: b.w + extra }; // label grows to the right; icon column stays fixed
}

/**
 * Resolves the effective rendering box for line 1 and line 2 of a label.
 * `iconRowWidth` is the horizontal extent (mm) of the large icon/symbol row on
 * the left (0 when there is none) — the text boxes shift right accordingly.
 * `extra` width from 2×/3× is given to the text boxes; a missing line2/line1
 * gets the full-height single box. Used to size text and bound the manual size.
 */
export function resolveLineBoxes(
  labelWidth: number,
  iconRowWidth: number,
  hasLine1: boolean,
  hasLine2: boolean
): { line1: Box2; line2: Box2 } {
  const extra = labelExtraWidth(labelWidth);
  const startX = iconRowWidth > 0 ? ICON_AREA_X + iconRowWidth + TEXT_ICON_GAP : ICON_AREA_X;
  const width = TEXT_RIGHT_EDGE - startX + extra;
  const box = (y: number, h: number): Box2 => widenBox({ x: startX, y, w: width, h }, 0);
  const line1 = !hasLine2 ? box(1.0, 9.5) : box(1.0, 4.25);
  const line2 = !hasLine1 ? box(1.0, 9.5) : box(6.25, 4.25);
  return { line1, line2 };
}