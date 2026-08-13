import { useEffect, useRef, useState } from "react";
import type { CustomIconMeta, LabelInput, TextFormat } from "../types/label";
import hexSvg from "../assets/hex.svg?raw";
import insertSvg from "../assets/insert.svg?raw";
import lockwasherSvg from "../assets/lockwasher.svg?raw";
import nutSvg from "../assets/nut.svg?raw";
import squareNutSvg from "../assets/square_nut.svg?raw";
import nylockSvg from "../assets/nylock.svg?raw";
import phillipsSvg from "../assets/phillips.svg?raw";
import slotSvg from "../assets/slot.svg?raw";
import torxSvg from "../assets/torx.svg?raw";
import washerSvg from "../assets/washer.svg?raw";
import washerLargeSvg from "../assets/washer_large.svg?raw";
import tNutSvg from "../assets/tnut.svg?raw";
import rollInTNutSvg from "../assets/roll-in-tnut.svg?raw";
import robertsonSvg from "../assets/robertson.svg?raw";
import wingnutSvg from "../assets/wingnut.svg?raw";

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

import { TextFormatControls } from "./TextFormatControls";
import { addCustomIcon, loadCustomIcons, removeCustomIcon } from "../services/iconStore";

const CLIPARTS = [
  { id: "hex",          label: "Hex",         svg: hexSvg,         viewBox: "299 276 111 111" },
  { id: "insert",       label: "Insert",      svg: insertSvg,      viewBox: "537 346 75 98"  },
  { id: "lockwasher",   label: "Lock Washer", svg: lockwasherSvg,  viewBox: "38 564 111 111" },
  { id: "nut",          label: "Nut",         svg: nutSvg,         viewBox: "307 549 137 120" },
  { id: "square_nut",   label: "Square nut",  svg: squareNutSvg,   viewBox: "-11 -11 130 130" },
  { id: "nylock",       label: "Nylock",      svg: nylockSvg,      viewBox: "477 549 137 120" },
  { id: "wingnut",      label: "Wingnut",     svg: wingnutSvg,     viewBox: "16 16 168 102" },
  { id: "phillips",     label: "Phillips",    svg: phillipsSvg,    viewBox: "81 51 112 112" },
  { id: "robertson",    label: "Robertson",   svg: robertsonSvg,   viewBox: "47 47 120 120" },
  { id: "slot",         label: "Slot",        svg: slotSvg,        viewBox: "35 125 125 113" },
  { id: "torx",         label: "Torx",        svg: torxSvg,        viewBox: "541 127 112 112" },
  { id: "washer",       label: "Washer",      svg: washerSvg,      viewBox: "38 280 112 112" },
  { id: "washer_large", label: "Washer L",    svg: washerLargeSvg, viewBox: "48 421 112 112" },
  { id: "t_nut",        label: "T-Nut",       svg: tNutSvg,        viewBox: "15 -35 80 120" },
  { id: "roll-in_t_nut",label: "Roll Nut",    svg: rollInTNutSvg,  viewBox: "-10 -10 100 170" },
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
  { id: "pan-st",  label: "Pan Self-Tap",  svg: trpPanSelfTapSvg,  viewBox: "134 329 97 33" },
];

const DEFAULT_FORMAT: TextFormat = { autoSize: true, hAlign: "center", vAlign: "center" };

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
  const [line2Enabled, setLine2Enabled] = useState(true);
  const [line1Format, setLine1Format] = useState<TextFormat>(DEFAULT_FORMAT);
  const [line2Format, setLine2Format] = useState<TextFormat>(DEFAULT_FORMAT);
  const [customIcons, setCustomIcons] = useState<CustomIconMeta[]>([]);
  const [importError, setImportError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomIcons(loadCustomIcons());
  }, []);

  // Custom icons merged after the built-in cliparts for lookup/selection.
  const allCliparts = [
    ...CLIPARTS,
    ...customIcons.map((c) => ({ id: c.id, label: c.name, svg: c.svg, viewBox: c.viewBox })),
  ];

  function buildLabel(): LabelInput {
    const clip = allCliparts.find((c) => c.id === selectedClipart);
    const iconSvg = clip?.svg ?? "";
    const iconViewBox = clip?.viewBox;
    const on = line2Enabled;
    const formats = {
      line1Format: { ...line1Format },
      line2Format: { ...line2Format },
    };
    if (line2Mode === "image" && selectedLine2Image && on) {
      const img = LINE2_IMAGES.find((i) => i.id === selectedLine2Image)!;
      return {
        title: [line1].filter(Boolean).join(" "),
        line1,
        line2: "",
        iconSvg,
        iconViewBox,
        line2Svg: img.svg,
        line2ViewBox: img.viewBox,
        labelWidth,
        line2Enabled: on,
        ...formats,
      };
    }
    const title = on ? [line1, line2].filter(Boolean).join(" ") : line1;
    return {
      title,
      line1,
      line2: on ? line2 : "",
      iconSvg,
      iconViewBox,
      labelWidth,
      line2Enabled: on,
      ...formats,
    };
  }

  // Emit preview on every change, and once on mount
  useEffect(() => {
    if (!onPreviewChange) return;
    onPreviewChange(buildLabel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line1, line2, line2Mode, selectedLine2Image, selectedClipart, labelWidth, line2Enabled, line1Format, line2Format, customIcons, onPreviewChange]);

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

  const handleImportIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      if (!/<\s*svg[\s>]/i.test(text)) {
        setImportError("Only SVG files are supported.");
        return;
      }
      const name = file.name.replace(/\.svg$/i, "").replace(/[_-]+/g, " ");
      const next = addCustomIcon(customIcons, text, name);
      setCustomIcons(next);
      const added = next[next.length - 1];
      if (added) setSelectedClipart(added.id);
    } catch {
      setImportError("Could not read the SVG file.");
    }
  };

  const handleRemoveIcon = (id: string) => {
    setCustomIcons((cur) => {
      const next = removeCustomIcon(cur, id);
      if (selectedClipart === id) setSelectedClipart(null);
      return next;
    });
  };

  return (
    <form className={`panel${isActive ? " panel-active" : ""}`} onSubmit={handleSubmit} onFocus={handleFocusEnter} onPointerDown={() => onActivate?.()}>
      <h2>Create Your Own Label</h2>

      <label>
        Line 1
        <input value={line1} onChange={(e) => setLine1(e.target.value)} required />
      </label>
      <TextFormatControls label="Line 1 format" format={line1Format} onChange={setLine1Format} />

      <div className="line2-field">
        <div className="line2-label-row">
          <label className="inline-check">
            <input
              type="checkbox"
              checked={line2Enabled}
              onChange={(e) => setLine2Enabled(e.target.checked)}
            />
            <span>Use line 2</span>
          </label>
          <div className="mode-toggle">
            <button
              type="button"
              className={line2Mode === "text" ? "active" : ""}
              onClick={() => setLine2Mode("text")}
              disabled={!line2Enabled}
            >
              Text
            </button>
            <button
              type="button"
              className={line2Mode === "image" ? "active" : ""}
              onClick={() => setLine2Mode("image")}
              disabled={!line2Enabled}
            >
              Image
            </button>
          </div>
        </div>
        {line2Enabled && (line2Mode === "text" ? (
          <>
            <input value={line2} onChange={(e) => setLine2(e.target.value)} />
            <TextFormatControls label="Line 2 format" format={line2Format} onChange={setLine2Format} />
          </>
        ) : (
          <div className="symbol-picker">
            {LINE2_IMAGES.map((img) => (
              <button
                key={img.id}
                type="button"
                className={`symbol-item${selectedLine2Image === img.id ? " selected" : ""}`}
                onClick={() => setSelectedLine2Image((prev) => (prev === img.id ? null : img.id))}
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
        ))}
      </div>

      <div className="symbol-section">
        <span>Symbol</span>
        <div className="symbol-picker">
          <button
            type="button"
            className={`symbol-item${selectedClipart === null ? " selected" : ""}`}
            onClick={() => setSelectedClipart(null)}
            title="No symbol — text uses the full label width"
          >
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="13" fill="none" stroke="#94a3b8" strokeWidth="3" />
              <line x1="10.8" y1="29.2" x2="29.2" y2="10.8" stroke="#94a3b8" strokeWidth="3" />
            </svg>
            <span>None</span>
          </button>
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
          {customIcons.map((c) => (
            <div key={c.id} className={`symbol-item custom-symbol${selectedClipart === c.id ? " selected" : ""}`}>
              <button
                type="button"
                className="symbol-select"
                onClick={() => setSelectedClipart((prev) => (prev === c.id ? null : c.id))}
                title={`${c.name} (custom, stored in this browser)`}
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
                <span>{c.name}</span>
              </button>
              <button
                type="button"
                className="symbol-remove"
                onClick={() => handleRemoveIcon(c.id)}
                title="Remove icon from this browser"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="import-row">
          <button type="button" className="import-btn" onClick={() => fileRef.current?.click()}>
            + Import SVG
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            style={{ display: "none" }}
            onChange={handleImportIcon}
          />
          <span className="import-hint">Stored in this browser (localStorage)</span>
        </div>
        {importError ? <span className="error msg-inline">{importError}</span> : null}
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