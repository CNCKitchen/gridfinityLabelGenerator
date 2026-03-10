import { useEffect, useState } from "react";
import type { LabelInput } from "../types/label";
import hexSvg from "../assets/hex.svg?raw";
import insertSvg from "../assets/insert.svg?raw";
import locknutSvg from "../assets/locknut.svg?raw";
import nutSvg from "../assets/nut.svg?raw";
import nylockSvg from "../assets/nylock.svg?raw";
import phSvg from "../assets/PH.svg?raw";
import slotSvg from "../assets/slot.svg?raw";
import txSvg from "../assets/tx.svg?raw";
import washerSvg from "../assets/washer_sml.svg?raw";
import trpButtonHeadSvg from "../assets/TRP_ButtonHead.svg?raw";
import trpCountersunkSvg from "../assets/TRP_countersunkHead.svg?raw";
import trpCylinderSvg from "../assets/TRP_cylinderHeadScrew.svg?raw";
import trpHexagonSvg from "../assets/TRP_hexagonHead.svg?raw";
import trpLowHeadSvg from "../assets/TRP_lowHeadScrew.svg?raw";
import trpPanHeadSvg from "../assets/TRP_PanHead.svg?raw";

const CLIPARTS = [
  { id: "hex",           label: "Hex",     svg: hexSvg },
  { id: "insert",        label: "Insert",  svg: insertSvg },
  { id: "locknut",       label: "Locknut", svg: locknutSvg },
  { id: "nut",           label: "Nut",     svg: nutSvg },
  { id: "nylock",        label: "Nylock",  svg: nylockSvg },
  { id: "ph",            label: "Phillips",svg: phSvg },
  { id: "slot",          label: "Slot",    svg: slotSvg },
  { id: "tx",            label: "Torx",    svg: txSvg },
  { id: "washer",        label: "Washer",  svg: washerSvg },
];

// TRP screw-profile images for the line-2 box.
// viewBox crops each A4-canvas SVG (793×1122) to the actual drawing area.
const LINE2_IMAGES = [
  { id: "btn", label: "Button Head",   svg: trpButtonHeadSvg,  viewBox: "25 1070 93 29" },
  { id: "csk", label: "Countersunk",   svg: trpCountersunkSvg, viewBox: "82 924 91 37" },
  { id: "cyl", label: "Cylinder Head", svg: trpCylinderSvg,    viewBox: "19 1080 96 31" },
  { id: "hex", label: "Hex Head",      svg: trpHexagonSvg,     viewBox: "12 1000 93 33" },
  { id: "low", label: "Low Head",      svg: trpLowHeadSvg,     viewBox: "28 1042 93 32" },
  { id: "pan", label: "Pan Head",      svg: trpPanHeadSvg,     viewBox: "72 977 107 31" },
];

interface LabelFormProps {
  onGenerate: (input: LabelInput) => Promise<void>;
  onPreviewChange?: (label: LabelInput) => void;
}

export function LabelForm({ onGenerate, onPreviewChange }: LabelFormProps) {
  const [line1, setLine1] = useState("M3x10");
  const [line2, setLine2] = useState("Screw");
  const [line2Mode, setLine2Mode] = useState<"text" | "image">("text");
  const [selectedLine2Image, setSelectedLine2Image] = useState<string | null>(null);
  const [selectedClipart, setSelectedClipart] = useState<string | null>("tx");
  const [labelWidth, setLabelWidth] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  function buildLabel(): LabelInput {
    const iconSvg = CLIPARTS.find((c) => c.id === selectedClipart)?.svg ?? "";
    if (line2Mode === "image" && selectedLine2Image) {
      const img = LINE2_IMAGES.find((i) => i.id === selectedLine2Image)!;
      const title = [line1].filter(Boolean).join(" ");
      return { title, line1, line2: "", iconSvg, line2Svg: img.svg, line2ViewBox: img.viewBox, labelWidth };
    }
    const title = [line1, line2].filter(Boolean).join(" ");
    return { title, line1, line2, iconSvg, labelWidth };
  }

  // Emit preview on every change, and once on mount
  useEffect(() => {
    if (!onPreviewChange) return;
    onPreviewChange(buildLabel());
  }, [line1, line2, line2Mode, selectedLine2Image, selectedClipart, labelWidth, onPreviewChange]);

  const handleFocusEnter = (e: React.FocusEvent<HTMLFormElement>) => {
    if (onPreviewChange && !e.currentTarget.contains(e.relatedTarget as Node)) {
      onPreviewChange(buildLabel());
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onGenerate(buildLabel());
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="panel" onSubmit={handleSubmit} onFocus={handleFocusEnter}>
      <h2>Create Your Own Label</h2>
      <label>
        Line 1
        <input value={line1} onChange={(e) => setLine1(e.target.value)} required />
      </label>
      <div className="line2-field">
        <div className="line2-label-row">
          <span>Line 2</span>
          <div className="mode-toggle">
            <button
              type="button"
              className={line2Mode === "text" ? "active" : ""}
              onClick={() => setLine2Mode("text")}
            >
              Text
            </button>
            <button
              type="button"
              className={line2Mode === "image" ? "active" : ""}
              onClick={() => setLine2Mode("image")}
            >
              Image
            </button>
          </div>
        </div>
        {line2Mode === "text" ? (
          <input value={line2} onChange={(e) => setLine2(e.target.value)} />
        ) : (
          <div className="symbol-picker">
            {LINE2_IMAGES.map((img) => (
              <button
                key={img.id}
                type="button"
                className={`symbol-item${selectedLine2Image === img.id ? " selected" : ""}`}
                onClick={() =>
                  setSelectedLine2Image((prev) => (prev === img.id ? null : img.id))
                }
                title={img.label}
              >
                <svg
                  viewBox={img.viewBox}
                  width="40"
                  height="40"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ filter: "invert(1)" }}
                >
                  <image
                    href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(img.svg)}`}
                    x="0"
                    y="0"
                    width="793.70079"
                    height="1122.5197"
                  />
                </svg>
                <span>{img.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="symbol-section">
        <span>Symbol</span>
        <div className="symbol-picker">
          {CLIPARTS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`symbol-item${selectedClipart === c.id ? " selected" : ""}`}
              onClick={() => setSelectedClipart((prev) => (prev === c.id ? null : c.id))}
              title={c.label}
            >
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`}
                alt={c.label}
              />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="width-selector">
        <span>Label Width</span>
        <div className="mode-toggle">
          {([1, 2, 3] as const).map((w) => (
            <button
              key={w}
              type="button"
              className={labelWidth === w ? "active" : ""}
              onClick={() => setLabelWidth(w)}
              title={`${w}×  (${(37.8 + (w - 1) * 42).toFixed(1)} mm)`}
            >
              {w}×
            </button>
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Generating..." : "Download STL"}
      </button>
    </form>
  );
}
