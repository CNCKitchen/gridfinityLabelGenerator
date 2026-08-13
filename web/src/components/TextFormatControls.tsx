import type { HAlign, TextFormat, VAlign } from "../types/label";

const H_OPTS: { v: HAlign; icon: string; title: string }[] = [
  { v: "left", icon: "⯇", title: "Align left" },
  { v: "center", icon: "❖", title: "Align center" },
  { v: "right", icon: "⯈", title: "Align right" },
];

const V_OPTS: { v: VAlign; icon: string; title: string }[] = [
  { v: "top", icon: "▲", title: "Align top" },
  { v: "center", icon: "◼", title: "Align middle" },
  { v: "bottom", icon: "▼", title: "Align bottom" },
];

interface TextFormatControlsProps {
  label: string;
  format: TextFormat;
  onChange: (f: TextFormat) => void;
}

/**
 * Per-line text formatting: auto-size toggle + manual size, and a 3×3
 * horizontal/vertical alignment grid. "Auto" sizing (default) picks the largest
 * size that fits the box; the manual field is clamped so it can never overflow.
 */
export function TextFormatControls({ label, format, onChange }: TextFormatControlsProps) {
  return (
    <div className="format-controls">
      <div className="format-title">{label}</div>

      <div className="format-row size-row">
        <label className="inline-check">
          <input
            type="checkbox"
            checked={format.autoSize}
            onChange={(e) => onChange({ ...format, autoSize: e.target.checked })}
          />
          <span>Auto</span>
        </label>
        <input
          className="size-input"
          type="number"
          min="1.2"
          max="20"
          step="0.1"
          value={format.fontSize ?? ""}
          disabled={format.autoSize}
          placeholder="Size"
          title="Manual font size (mm). Clamped to fit the box."
          onChange={(e) => onChange({ ...format, fontSize: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="format-row align-row">
        <span className="align-axis">H</span>
        <div className="align-grid">
          {H_OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`align-btn${format.hAlign === o.v ? " active" : ""}`}
              onClick={() => onChange({ ...format, hAlign: o.v })}
              title={o.title}
            >
              {o.icon}
            </button>
          ))}
        </div>
        <span className="align-axis">V</span>
        <div className="align-grid">
          {V_OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`align-btn${format.vAlign === o.v ? " active" : ""}`}
              onClick={() => onChange({ ...format, vAlign: o.v })}
              title={o.title}
            >
              {o.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}