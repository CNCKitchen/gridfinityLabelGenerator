import fs from "node:fs";
import path from "node:path";

export interface PredefinedLabel {
  id: string;
  title: string;
  line1: string;
  line2: string;
  icon: "nut.svg" | "torx.svg" | "insert.svg";
}

export const predefinedLabels: PredefinedLabel[] = [
  { id: "m2-hex-nut", title: "M2 Hex Nut", line1: "M2", line2: "Hex Nut", icon: "nut.svg" },
  { id: "m3-hex-nut", title: "M3 Hex Nut", line1: "M3", line2: "Hex Nut", icon: "nut.svg" },
  { id: "m3x8-socket", title: "M3x8 Socket", line1: "M3x8", line2: "Socket", icon: "torx.svg" },
  { id: "m3x12-socket", title: "M3x12 Socket", line1: "M3x12", line2: "Socket", icon: "torx.svg" },
  { id: "m4x10-socket", title: "M4x10 Socket", line1: "M4x10", line2: "Socket", icon: "torx.svg" },
  { id: "m5-heat-insert", title: "M5 Insert", line1: "M5", line2: "Insert", icon: "insert.svg" }
];

export function readIcon(iconName: PredefinedLabel["icon"]): string {
  const iconPath = path.resolve(process.cwd(), "..", "new_assets", iconName);
  return fs.readFileSync(iconPath, "utf8");
}
