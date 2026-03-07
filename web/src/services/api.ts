import { zipSync } from "fflate";
import txSvg from "../assets/tx.svg?raw";
import washerSvg from "../assets/washer_sml.svg?raw";
import screwLowHeadSvg from "../assets/screw_lowHead.svg?raw";
import type { LabelInput, PredefinedLabel } from "../types/label";
import { generateLabelStl } from "./labelGenerator";

const ICON_MAP: Record<string, string> = {
  "tx.svg": txSvg,
  "washer_sml.svg": washerSvg,
  "screw_lowHead.svg": screwLowHeadSvg,
};

// Maps line2 text values to an SVG image used when "Use image for line 2" is enabled.
// Only "Screw" is mapped for now; all other line2 values fall back to text.
const LINE2_SVG_MAP: Record<string, string> = {
  Screw: screwLowHeadSvg,
};

const PREDEFINED_DATA: Array<Omit<PredefinedLabel, "iconSvg">> = [
  // INSERTS
{ id: "m2x3p0-heat-insert",       title: "M2x3.0 Insert",        line1: "M2x3.0",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M2" },
{ id: "m2p5x4-heat-insert",       title: "M2.5x4 Insert",        line1: "M2.5x4",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M2.5" },

{ id: "m3x3p0-heat-insert",       title: "M3x3.0 Insert",        line1: "M3x3.0",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M3" },
{ id: "m3x5p7-heat-insert",       title: "M3x5.7 Insert",        line1: "M3x5.7",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M3" },
{ id: "m3x5x4-heat-insert",       title: "M3x5x4 Insert",        line1: "M3x5x4",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M3" },

{ id: "m4x4p0-heat-insert",       title: "M4x4.0 Insert",        line1: "M4x4.0",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M4" },
{ id: "m4x8p1-heat-insert",       title: "M4x8.1 Insert",        line1: "M4x8.1",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M4" },

{ id: "m5x5p8-heat-insert",       title: "M5x5.8 Insert",        line1: "M5x5.8",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M5" },
{ id: "m5x9p5-heat-insert",       title: "M5x9.5 Insert",        line1: "M5x9.5",       line2: "Insert", icon: "insert.svg", category: "inserts", size: "M5" },

{ id: "m6x12p7-heat-insert",      title: "M6x12.7 Insert",       line1: "M6x12.7",      line2: "Insert", icon: "insert.svg", category: "inserts", size: "M6" },
{ id: "m8x12p7-heat-insert",      title: "M8x12.7 Insert",       line1: "M8x12.7",      line2: "Insert", icon: "insert.svg", category: "inserts", size: "M8" },
{ id: "m10x12p7-heat-insert",     title: "M10x12.7 Insert",      line1: "M10x12.7",     line2: "Insert", icon: "insert.svg", category: "inserts", size: "M10" },

// IMPERIAL / SPECIAL INSERTS
{ id: "2-56x3p2-heat-insert",     title: "#2-56x3.2 Insert",     line1: "#2-56x3.2",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#2-56" },
{ id: "4-40x3p6-heat-insert",     title: "#4-40x3.6 Insert",     line1: "#4-40x3.6",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#4-40" },
{ id: "4-40x5p7-heat-insert",     title: "#4-40x5.7 Insert",     line1: "#4-40x5.7",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#4-40" },
{ id: "6-32x3p8-heat-insert",     title: "#6-32x3.8 Insert",     line1: "#6-32x3.8",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#6-32" },
{ id: "6-32x7p1-heat-insert",     title: "#6-32x7.1 Insert",     line1: "#6-32x7.1",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#6-32" },
{ id: "8-32x4p7-heat-insert",     title: "#8-32x4.7 Insert",     line1: "#8-32x4.7",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#8-32" },
{ id: "8-32x8p2-heat-insert",     title: "#8-32x8.2 Insert",     line1: "#8-32x8.2",    line2: "Insert", icon: "insert.svg", category: "inserts", size: "#8-32" },
{ id: "10-24x9p5-heat-insert",    title: "#10-24x9.5 Insert",    line1: "#10-24x9.5",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "#10-24" },
{ id: "10-32x9p5-heat-insert",    title: "#10-32x9.5 Insert",    line1: "#10-32x9.5",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "#10-32" },

{ id: "1-4-20x6p4-heat-insert",   title: '1/4"-20x6.4 Insert',   line1: '1/4"-20x6.4',  line2: "Insert", icon: "insert.svg", category: "inserts", size: '1/4"-20' },
{ id: "1-4-20x12p7-heat-insert",  title: '1/4"-20x12.7 Insert',  line1: '1/4"-20x12.7', line2: "Insert", icon: "insert.svg", category: "inserts", size: '1/4"-20' },
{ id: "5-16-18x12p7-heat-insert", title: '5/16"-18x12.7 Insert', line1: '5/16"-18x12.7',line2: "Insert", icon: "insert.svg", category: "inserts", size: '5/16"-18' },
{ id: "3-8-16x12p7-heat-insert",  title: '3/8"-16x12.7 Insert',  line1: '3/8"-16x12.7', line2: "Insert", icon: "insert.svg", category: "inserts", size: '3/8"-16' },
{ id: "g1-8-28x12p7-heat-insert", title: "G1/8-28x12.7 Insert",  line1: "G1/8-28x12.7", line2: "Insert", icon: "insert.svg", category: "inserts", size: "G1/8-28" },

  // M1.6
  { id: "m1p6x3-socket",  title: "M1.6x3 Screw",  line1: "M1.6x3",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x4-socket",  title: "M1.6x4 Screw",  line1: "M1.6x4",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x5-socket",  title: "M1.6x5 Screw",  line1: "M1.6x5",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x6-socket",  title: "M1.6x6 Screw",  line1: "M1.6x6",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x8-socket",  title: "M1.6x8 Screw",  line1: "M1.6x8",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x10-socket", title: "M1.6x10 Screw", line1: "M1.6x10", line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x12-socket", title: "M1.6x12 Screw", line1: "M1.6x12", line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x14-socket", title: "M1.6x14 Screw", line1: "M1.6x14", line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },
  { id: "m1p6x16-socket", title: "M1.6x16 Screw", line1: "M1.6x16", line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M1.6", wrenchSize: "TX5" },

  // M2
{ id: "m2x4-socket",   title: "M2x4 Screw",   line1: "M2x4",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2", wrenchSize: "TX6" },
{ id: "m2x6-socket",   title: "M2x6 Screw",   line1: "M2x6",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2", wrenchSize: "TX6" },
{ id: "m2x10-socket",  title: "M2x10 Screw",  line1: "M2x10",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2", wrenchSize: "TX6" },
{ id: "m2x12-socket",  title: "M2x12 Screw",  line1: "M2x12",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2", wrenchSize: "TX6" },
{ id: "m2x16-socket",  title: "M2x16 Screw",  line1: "M2x16",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2", wrenchSize: "TX6" },
{ id: "m2x20-socket",  title: "M2x20 Screw",  line1: "M2x20",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2", wrenchSize: "TX6" },

// M2.5
{ id: "m2p5x4-socket",   title: "M2.5x4 Screw",   line1: "M2.5x4",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },
{ id: "m2p5x6-socket",   title: "M2.5x6 Screw",   line1: "M2.5x6",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },
{ id: "m2p5x10-socket",  title: "M2.5x10 Screw",  line1: "M2.5x10",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },
{ id: "m2p5x12-socket",  title: "M2.5x12 Screw",  line1: "M2.5x12",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },
{ id: "m2p5x18-socket",  title: "M2.5x18 Screw",  line1: "M2.5x18",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },
{ id: "m2p5x25-socket",  title: "M2.5x25 Screw",  line1: "M2.5x25",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },
{ id: "m2p5x30-socket",  title: "M2.5x30 Screw",  line1: "M2.5x30",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M2.5", wrenchSize: "TX8" },

// M3
{ id: "m3x4-socket",   title: "M3x4 Screw",   line1: "M3x4",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x6-socket",   title: "M3x6 Screw",   line1: "M3x6",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x8-socket",   title: "M3x8 Screw",   line1: "M3x8",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x10-socket",  title: "M3x10 Screw",  line1: "M3x10",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x12-socket",  title: "M3x12 Screw",  line1: "M3x12",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x14-socket",  title: "M3x14 Screw",  line1: "M3x14",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x16-socket",  title: "M3x16 Screw",  line1: "M3x16",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x18-socket",  title: "M3x18 Screw",  line1: "M3x18",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x20-socket",  title: "M3x20 Screw",  line1: "M3x20",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x25-socket",  title: "M3x25 Screw",  line1: "M3x25",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x30-socket",  title: "M3x30 Screw",  line1: "M3x30",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x35-socket",  title: "M3x35 Screw",  line1: "M3x35",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x40-socket",  title: "M3x40 Screw",  line1: "M3x40",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },
{ id: "m3x45-socket",  title: "M3x45 Screw",  line1: "M3x45",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M3", wrenchSize: "TX10" },

// M4
{ id: "m4x5-socket",   title: "M4x5 Screw",   line1: "M4x5",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x6-socket",   title: "M4x6 Screw",   line1: "M4x6",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x10-socket",  title: "M4x10 Screw",  line1: "M4x10",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x14-socket",  title: "M4x14 Screw",  line1: "M4x14",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x16-socket",  title: "M4x16 Screw",  line1: "M4x16",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x20-socket",  title: "M4x20 Screw",  line1: "M4x20",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x25-socket",  title: "M4x25 Screw",  line1: "M4x25",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x30-socket",  title: "M4x30 Screw",  line1: "M4x30",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x35-socket",  title: "M4x35 Screw",  line1: "M4x35",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x40-socket",  title: "M4x40 Screw",  line1: "M4x40",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },
{ id: "m4x50-socket",  title: "M4x50 Screw",  line1: "M4x50",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M4", wrenchSize: "TX20" },

// M5
{ id: "m5x6-socket",   title: "M5x6 Screw",   line1: "M5x6",   line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x10-socket",  title: "M5x10 Screw",  line1: "M5x10",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x16-socket",  title: "M5x16 Screw",  line1: "M5x16",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x20-socket",  title: "M5x20 Screw",  line1: "M5x20",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x25-socket",  title: "M5x25 Screw",  line1: "M5x25",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x35-socket",  title: "M5x35 Screw",  line1: "M5x35",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x40-socket",  title: "M5x40 Screw",  line1: "M5x40",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },
{ id: "m5x45-socket",  title: "M5x45 Screw",  line1: "M5x45",  line2: "Screw", icon: "tx.svg", category: "fasteners", size: "M5", wrenchSize: "TX25" },

  // M6
  { id: "m6-hex-nut",     title: "M6 Hex Nut",     line1: "M6", line2: "Hex Nut", icon: "nut.svg", category: "fasteners", size: "M6" },
  { id: "m6-nylock-nut",  title: "M6 Nylock Nut",  line1: "M6", line2: "Nylock Nut", icon: "nylock.svg", category: "fasteners", size: "M6" },
  { id: "m6-washer",      title: "M6 Washer",      line1: "M6", line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M6" },
  { id: "m6-large-washer", title: "M6 Large Washer", line1: "M6", line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M6" },

  // M8
  { id: "m8-hex-nut",     title: "M8 Hex Nut",     line1: "M8", line2: "Hex Nut", icon: "nut.svg", category: "fasteners", size: "M8" },
  { id: "m8-nylock-nut",  title: "M8 Nylock Nut",  line1: "M8", line2: "Nylock Nut", icon: "nylock.svg", category: "fasteners", size: "M8" },
  { id: "m8-washer",      title: "M8 Washer",      line1: "M8", line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M8" },
  { id: "m8-large-washer", title: "M8 Large Washer", line1: "M8", line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M8" },
];

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "label";
}

export async function fetchPredefined(): Promise<PredefinedLabel[]> {
  return PREDEFINED_DATA.map((p) => ({
    ...p,
    iconSvg: ICON_MAP[p.icon] ?? "",
    line2Svg: LINE2_SVG_MAP[p.line2],
  }));
}

export async function downloadSingle(label: LabelInput): Promise<Blob> {
  const stl = await generateLabelStl(label);
  return new Blob([stl], { type: "model/stl" });
}

export async function downloadBatch(labels: LabelInput[]): Promise<{ blob: Blob; isZip: boolean }> {
  if (labels.length === 1) {
    return { blob: await downloadSingle(labels[0]), isZip: false };
  }

  const files: Record<string, Uint8Array> = {};
  for (const label of labels) {
    const stl = await generateLabelStl(label);
    files[slugify(label.title) + ".stl"] = new Uint8Array(stl);
  }
  const zipped = zipSync(files, { level: 9 });
  const zipBuf = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
  return { blob: new Blob([zipBuf], { type: "application/zip" }), isZip: true };
}
