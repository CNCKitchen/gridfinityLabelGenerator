export interface LabelInput {
  id?: string;
  title: string;
  line1: string;
  line2: string;
  iconSvg: string;
}

export type LabelCategory = "fasteners" | "inserts";

export interface PredefinedLabel extends LabelInput {
  icon: string;
  category: LabelCategory;
  size: string;
}
