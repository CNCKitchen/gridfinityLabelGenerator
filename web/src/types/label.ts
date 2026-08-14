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

/**
 * A named image that can be embedded in a line's text via `${Name}`.
 * `name` is what a user types in the text (e.g. "Button Head"); `svg` is the
 * source SVG and `viewBox` its tight content crop. Built-in cliparts and the
 * screw-profile images expose this shape directly.
 */
export interface ImageAsset {
  id: string;
  name: string;
  svg: string;
  viewBox?: string;
}

/** A user-imported SVG icon stored in the browser. */
export interface CustomIconMeta extends ImageAsset {
  /** Content viewBox ("x y w h") auto-derived from the SVG paths. Required here. */
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
  /**
   * Template for the large symbol/icon row on the far left (e.g. "${Hex}").
   * Rendered as a row of icons; its width shifts the Line 1/Line 2 boxes right.
   * When empty/absent, legacy `iconSvg`/`iconText` (fixed 9.5mm box) is used.
   */
  symbol?: string;
  line2Svg?: string;    // legacy: line-2 box filled by an image instead of text
  line2ViewBox?: string; // viewBox crop for line2Svg (A4-canvas SVGs need cropping)
  labelWidth?: 1 | 2 | 3; // number of gridfinity units wide (37.8 + (n-1)*42 mm)
  /** Formatting for line 1 (defaults: autoSize, center/center). */
  line1Format?: TextFormat;
  /** Formatting for line 2 (defaults: autoSize, center/center). */
  line2Format?: TextFormat;
  /** When false, line 2 (and its SVG image) is skipped entirely. Default true. */
  line2Enabled?: boolean;
  /**
   * Named images available for `${Name}` references in `line1`/`line2`/`symbol`.
   * Defaults to the built-in image registry when omitted.
   */
  icons?: ImageAsset[];
}

export type LabelCategory = "fasteners" | "inserts";
export type IconKey = "tx" | "washer" | "washer_large" | "screwLowHead" | "insert" | "nut" | "nylock";

export interface PredefinedLabel extends LabelInput {
  icon: IconKey;
  category: LabelCategory;
  size: string;
  wrenchSize?: string;
}