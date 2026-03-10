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
}

export type LabelCategory = "fasteners" | "inserts";
export type IconKey = "tx" | "washer" | "screwLowHead" | "insert" | "nut" | "nylock";

export interface PredefinedLabel extends LabelInput {
  icon: IconKey;
  category: LabelCategory;
  size: string;
  wrenchSize?: string;
}
