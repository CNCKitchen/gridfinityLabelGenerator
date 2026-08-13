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