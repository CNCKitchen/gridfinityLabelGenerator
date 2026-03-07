export interface LabelInput {
  id?: string;
  title: string;
  line1: string;
  line2: string;
  iconSvg: string;
  iconText?: string;
  line2Svg?: string; // SVG to render in the line-2 box instead of text
}

export type LabelCategory = "fasteners" | "inserts";

export interface PredefinedLabel extends LabelInput {
  icon: string;
  category: LabelCategory;
  size: string;
  wrenchSize?: string;
}
