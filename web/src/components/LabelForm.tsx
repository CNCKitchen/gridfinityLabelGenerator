import { useEffect, useState } from "react";
import type { LabelInput } from "../types/label";
import hexSvg from "../assets/hex.svg?raw";
import insertSvg from "../assets/insert.svg?raw";
import lockwasherSvg from "../assets/lockwasher.svg?raw";
import nutSvg from "../assets/nut.svg?raw";
import nylockSvg from "../assets/nylock.svg?raw";
import phillipsSvg from "../assets/phillips.svg?raw";
import slotSvg from "../assets/slot.svg?raw";
import torxSvg from "../assets/torx.svg?raw";
import washerSvg from "../assets/washer.svg?raw";
import washerLargeSvg from "../assets/washer_large.svg?raw";
import trpButtonHeadSvg from "../assets/TRP_ButtonHead.svg?raw";
import trpCountersunkSvg from "../assets/TRP_countersunkHead.svg?raw";
import trpCskSelfTapSvg from "../assets/TRP_countersunk_selfTapping.svg?raw";
import trpCylinderSvg from "../assets/TRP_cylinderHeadScrew.svg?raw";
import trpCylSelfTapSvg from "../assets/TRP_cylinderHead_selfTapping.svg?raw";
import trpGrubSvg from "../assets/TRP_grubscrew.svg?raw";
import trpHexagonSvg from "../assets/TRP_hexagonHead.svg?raw";
import trpLowHeadSvg from "../assets/TRP_lowHeadScrew.svg?raw";
import trpPanHeadSvg from "../assets/TRP_PanHead.svg?raw";
import trpPanSelfTapSvg from "../assets/TRP_panHead_selfTapping.svg?raw";

const CLIPARTS = [
  { id: "hex",          label: "Hex",         svg: hexSvg,         viewBox: "299 276 111 111" },
  { id: "insert",       label: "Insert",      svg: insertSvg,      viewBox: "537 346 75 98"  },
  { id: "lockwasher",   label: "Lock Washer", svg: lockwasherSvg,  viewBox: "38 564 111 111" },
  { id: "nut",          label: "Nut",         svg: nutSvg,         viewBox: "307 549 137 120" },
  { id: "nylock",       label: "Nylock",      svg: nylockSvg,      viewBox: "477 549 137 120" },
  { id: "phillips",     label: "Phillips",    svg: phillipsSvg,    viewBox: "81 51 112 112" },
  { id: "slot",         label: "Slot",        svg: slotSvg,        viewBox: "35 125 125 113" },
  { id: "torx",         label: "Torx",        svg: torxSvg,        viewBox: "541 127 112 112" },
  { id: "washer",       label: "Washer",      svg: washerSvg,      viewBox: "38 280 112 112" },
  { id: "washer_large", label: "Washer L",    svg: washerLargeSvg, viewBox: "48 421 112 112" },
];

// TRP screw-profile images for the line-2 box.
// viewBox crops each A4-canvas SVG (793×1122) to the actual drawing area.
const LINE2_IMAGES = [
  { id: "btn",     label: "Button Head",   svg: trpButtonHeadSvg,  viewBox: "25 1070 93 29"  },
  { id: "csk",     label: "Countersunk",   svg: trpCountersunkSvg, viewBox: "82 924 91 37"  },
  { id: "csk-st",  label: "Csk Self-Tap",  svg: trpCskSelfTapSvg,  viewBox: "136 255 98 38"  },
  { id: "cyl",     label: "Cylinder Head", svg: trpCylinderSvg,    viewBox: "19 1080 96 31"  },
  { id: "cyl-st",  label: "Cyl Self-Tap",  svg: trpCylSelfTapSvg,  viewBox: "133 400 103 35" },
  { id: "grub",    label: "Grub Screw",    svg: trpGrubSvg,        viewBox: "84 265 44 22"  },
  { id: "hex",     label: "Hex Head",      svg: trpHexagonSvg,     viewBox: "12 1000 93 33"  },
  { id: "low",     label: "Low Head",      svg: trpLowHeadSvg,     viewBox: "28 1042 93 32"  },
  { id: "pan",     label: "Pan Head",      svg: trpPanHeadSvg,     viewBox: "72 977 107 31"  },
  { id: "pan-st",  label: "Pan Self-Tap",  svg: trpPanSelfTapSvg,  viewBox: "108 328 122 34" },
];

interface LabelFormProps {
  onGenerate: (input: LabelInput) => Promise<void>;
  onPreviewChange?: (label: LabelInput) => void;
  isActive?: boolean;
  onActivate?: () => void;
}

export function LabelForm({ onGenerate, onPreviewChange, isActive, onActivate }: LabelFormProps) {
  const [line1, setLine1] = useState("M3x10");
  const [line2, setLine2] = useState("Screw");
  const [line2Mode, setLine2Mode] = useState<"text" | "image">("text");
  const [selectedLine2Image, setSelectedLine2Image] = useState<string | null>(null);
  const [selectedClipart, setSelectedClipart] = useState<string | null>("torx");
  const [labelWidth, setLabelWidth] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  function buildLabel(): LabelInput {
    const clip = CLIPARTS.find((c) => c.id === selectedClipart);
    const iconSvg = clip?.svg ?? "";
    const iconViewBox = clip?.viewBox;
    if (line2Mode === "image" && selectedLine2Image) {
      const img = LINE2_IMAGES.find((i) => i.id === selectedLine2Image)!;
      const title = [line1].filter(Boolean).join(" ");
      return { title, line1, line2: "", iconSvg, iconViewBox, line2Svg: img.svg, line2ViewBox: img.viewBox, labelWidth };
    }
    const title = [line1, line2].filter(Boolean).join(" ");
    return { title, line1, line2, iconSvg, iconViewBox, labelWidth };
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
    <form className={`panel${isActive ? " panel-active" : ""}`} onSubmit={handleSubmit} onFocus={handleFocusEnter} onPointerDown={() => onActivate?.()}>
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
              <svg
                viewBox={c.viewBox}
                width="40"
                height="40"
                preserveAspectRatio="xMidYMid meet"
                style={{ filter: "invert(1)" }}
              >
                <image
                  href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`}
                  x="0"
                  y="0"
                  width="793.70079"
                  height="1122.5197"
                />
              </svg>
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
