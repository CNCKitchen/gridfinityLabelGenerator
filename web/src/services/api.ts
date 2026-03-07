import { zipSync } from "fflate";
import txSvg from "../assets/tx.svg?raw";
import washerSvg from "../assets/washer_sml.svg?raw";
import type { LabelInput, PredefinedLabel } from "../types/label";
import { generateLabelStl } from "./labelGenerator";

const ICON_MAP: Record<string, string> = {
  "tx.svg": txSvg,
  "washer_sml.svg": washerSvg,
};

const ADDITIONAL_DATA: Array<Omit<PredefinedLabel, "iconSvg">> = [
  // INSERTS
  { id: "m1p6-heat-insert", title: "M1.6 Insert", line1: "M1.6", line2: "Insert", icon: "insert.svg", category: "inserts", size: "M1.6" },
  { id: "m2-heat-insert",   title: "M2 Insert",   line1: "M2",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "M2" },
  { id: "m2p5-heat-insert", title: "M2.5 Insert", line1: "M2.5", line2: "Insert", icon: "insert.svg", category: "inserts", size: "M2.5" },
  { id: "m3-heat-insert",   title: "M3 Insert",   line1: "M3",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "M3" },
  { id: "m4-heat-insert",   title: "M4 Insert",   line1: "M4",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "M4" },
  { id: "m6-heat-insert",   title: "M6 Insert",   line1: "M6",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "M6" },
  { id: "m8-heat-insert",   title: "M8 Insert",   line1: "M8",   line2: "Insert", icon: "insert.svg", category: "inserts", size: "M8" },
  { id: "m10-heat-insert",  title: "M10 Insert",  line1: "M10",  line2: "Insert", icon: "insert.svg", category: "inserts", size: "M10" },

  // M1.6
  { id: "m1p6x3-socket",  title: "M1.6x3 Socket",  line1: "M1.6x3",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x4-socket",  title: "M1.6x4 Socket",  line1: "M1.6x4",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x5-socket",  title: "M1.6x5 Socket",  line1: "M1.6x5",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x6-socket",  title: "M1.6x6 Socket",  line1: "M1.6x6",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x8-socket",  title: "M1.6x8 Socket",  line1: "M1.6x8",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x10-socket", title: "M1.6x10 Socket", line1: "M1.6x10", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x12-socket", title: "M1.6x12 Socket", line1: "M1.6x12", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x14-socket", title: "M1.6x14 Socket", line1: "M1.6x14", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },
  { id: "m1p6x16-socket", title: "M1.6x16 Socket", line1: "M1.6x16", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M1.6" },

  // M2
  { id: "m2x4-socket",   title: "M2x4 Socket",   line1: "M2x4",   line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2" },
  { id: "m2x6-socket",   title: "M2x6 Socket",   line1: "M2x6",   line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2" },
  { id: "m2x10-socket",  title: "M2x10 Socket",  line1: "M2x10",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2" },
  { id: "m2x12-socket",  title: "M2x12 Socket",  line1: "M2x12",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2" },
  { id: "m2x16-socket",  title: "M2x16 Socket",  line1: "M2x16",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2" },
  { id: "m2x20-socket",  title: "M2x20 Socket",  line1: "M2x20",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2" },
  { id: "m2-washer",     title: "M2 Washer",     line1: "M2",     line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M2" },
  { id: "m2-large-washer", title: "M2 Large Washer", line1: "M2", line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M2" },

  // M2.5
  { id: "m2p5x4-socket",   title: "M2.5x4 Socket",   line1: "M2.5x4",   line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5x6-socket",   title: "M2.5x6 Socket",   line1: "M2.5x6",   line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5x10-socket",  title: "M2.5x10 Socket",  line1: "M2.5x10",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5x12-socket",  title: "M2.5x12 Socket",  line1: "M2.5x12",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5x18-socket",  title: "M2.5x18 Socket",  line1: "M2.5x18",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5x25-socket",  title: "M2.5x25 Socket",  line1: "M2.5x25",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5x30-socket",  title: "M2.5x30 Socket",  line1: "M2.5x30",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5-hex-nut",    title: "M2.5 Hex Nut",    line1: "M2.5",     line2: "Hex Nut", icon: "nut.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5-nylock-nut", title: "M2.5 Nylock Nut", line1: "M2.5",     line2: "Nylock Nut", icon: "nylock.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5-washer",     title: "M2.5 Washer",     line1: "M2.5",     line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M2.5" },
  { id: "m2p5-large-washer", title: "M2.5 Large Washer", line1: "M2.5", line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M2.5" },

  // M3
  { id: "m3-nylock-nut",    title: "M3 Nylock Nut",    line1: "M3", line2: "Nylock Nut", icon: "nylock.svg", category: "fasteners", size: "M3" },
  { id: "m3-washer",        title: "M3 Washer",        line1: "M3", line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M3" },
  { id: "m3-large-washer",  title: "M3 Large Washer",  line1: "M3", line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M3" },

  // M4
  { id: "m4-hex-nut",       title: "M4 Hex Nut",       line1: "M4", line2: "Hex Nut", icon: "nut.svg", category: "fasteners", size: "M4" },
  { id: "m4-nylock-nut",    title: "M4 Nylock Nut",    line1: "M4", line2: "Nylock Nut", icon: "nylock.svg", category: "fasteners", size: "M4" },
  { id: "m4-washer",        title: "M4 Washer",        line1: "M4", line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M4" },
  { id: "m4-large-washer",  title: "M4 Large Washer",  line1: "M4", line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M4" },

  // M5
  { id: "m5x6-socket",    title: "M5x6 Socket",    line1: "M5x6",  line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x10-socket",   title: "M5x10 Socket",   line1: "M5x10", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x16-socket",   title: "M5x16 Socket",   line1: "M5x16", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x20-socket",   title: "M5x20 Socket",   line1: "M5x20", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x25-socket",   title: "M5x25 Socket",   line1: "M5x25", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x35-socket",   title: "M5x35 Socket",   line1: "M5x35", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x40-socket",   title: "M5x40 Socket",   line1: "M5x40", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5x45-socket",   title: "M5x45 Socket",   line1: "M5x45", line2: "Socket", icon: "tx.svg", category: "fasteners", size: "M5" },
  { id: "m5-hex-nut",     title: "M5 Hex Nut",     line1: "M5",    line2: "Hex Nut", icon: "nut.svg", category: "fasteners", size: "M5" },
  { id: "m5-nylock-nut",  title: "M5 Nylock Nut",  line1: "M5",    line2: "Nylock Nut", icon: "nylock.svg", category: "fasteners", size: "M5" },
  { id: "m5-washer",      title: "M5 Washer",      line1: "M5",    line2: "Washer", icon: "washer_sml.svg", category: "fasteners", size: "M5" },
  { id: "m5-large-washer", title: "M5 Large Washer", line1: "M5",  line2: "Large Washer", icon: "washer_sml.svg", category: "fasteners", size: "M5" },

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
  return PREDEFINED_DATA.map((p) => ({ ...p, iconSvg: ICON_MAP[p.icon] ?? "" }));
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
