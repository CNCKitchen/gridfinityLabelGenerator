/** Horizontal alignment options for a single text line. */
export type HAlign = "left" | "center" | "right";
/** Vertical alignment options for a single text line. */
export type VAlign = "top" | "center" | "bottom";

/**
 * Per-line formatting controls.
 *
 * - `autoSize`: when true the font size is auto-fit to the box; when false a
 *   manual `fontSize` is used (clamped so it can never exceed the box).
 * - `hAlign` / `vAlign`: where the text sits within its box (3×3 grid).
 *   Defaults are "center"/"center" (current behaviour).
 */
export interface TextFormat {
  autoSize: boolean;
  fontSize?: number;
  hAlign: HAlign;
  vAlign: VAlign;
}

/** A user-imported SVG icon stored in the browser. */
export interface CustomIconMeta {
  id: string;
  name: string;
  svg: string;
  /** Content viewBox ("x y w h") auto-derived from the SVG paths. */
  viewBox: string;
}

export interface LabelInput {
  id?: string;
  title: string;
  line1: string;
  line2: string;
  iconSvg: string;
  iconViewBox?: string;  // viewBox crop for iconSvg (A4-canvas SVGs need cropping)
  iconText?: string;
  line2Svg?: string;    // SVG to render in the line-2 box instead of text
  line2ViewBox?: string; // viewBox crop for line2Svg (A4-canvas SVGs need cropping)
  labelWidth?: 1 | 2 | 3; // number of gridfinity units wide (37.8 + (n-1)*42 mm)
  /** Formatting for line 1 (defaults: autoSize, center/center). */
  line1Format?: TextFormat;
  /** Formatting for line 2 (defaults: autoSize, center/center). */
  line2Format?: TextFormat;
  /** When false, line 2 (and its SVG image) is skipped entirely. Default true. */
  line2Enabled?: boolean;
}

export type LabelCategory = "fasteners" | "inserts";
export type IconKey = "tx" | "washer" | "washer_large" | "screwLowHead" | "insert" | "nut" | "nylock";

export interface PredefinedLabel extends LabelInput {
  icon: IconKey;
  category: LabelCategory;
  size: string;
  wrenchSize?: string;
}