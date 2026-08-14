import { useEffect, useState } from "react";
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

/** Round to one decimal place so input values like 12.200000000000003 show as 12.2. */
const round1 = (n: number) => Math.round(n * 10) / 10;

const SIZE_MIN = 1.2;
const SIZE_FALLBACK_MAX = 20;

interface TextFormatControlsProps {
  label: string;
  format: TextFormat;
  onChange: (f: TextFormat) => void;
  /** Upper bound for the manual size (the largest size that fits the line's box). */
  maxSize?: number;
}

/**
 * Per-line text formatting: auto-size toggle + manual size, and a 3×3
 * horizontal/vertical alignment grid. "Auto" sizing (default) picks the largest
 * size that fits the box; the manual field is clamped to the box on blur.
 *
 * While the user is typing, no clamping happens (so a value like "10" can be
 * entered without a premature min/max snap) — the field only clamps and rounds
 * once the input loses focus. The stepper arrows round natively via `step`.
 */
export function TextFormatControls({ label, format, onChange, maxSize }: TextFormatControlsProps) {
  const upper = maxSize && maxSize > SIZE_MIN ? round1(maxSize) : SIZE_FALLBACK_MAX;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(format.fontSize != null ? round1(format.fontSize).toString() : "");

  // Mirror the committed format back into the field whenever not editing, so
  // external changes (auto toggle, reset, stepper commits) are reflected.
  useEffect(() => {
    if (focused) return;
    setDraft(format.fontSize != null ? round1(format.fontSize).toString() : "");
  }, [focused, format.fontSize, format.autoSize]);

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
          min={SIZE_MIN}
          max={upper}
          step="0.1"
          value={draft}
          disabled={format.autoSize}
          placeholder="Size"
          title="Manual font size (mm). Clamped to fit the box."
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            // Only commit live when the value is already a valid, in-range
            // number (e.g. stepper arrows). Partial or out-of-bounds keystrokes
            // ("1", "10") are left as a draft until blur.
            const n = Number(raw);
            if (raw && Number.isFinite(n) && n >= SIZE_MIN && n <= upper) {
              onChange({ ...format, fontSize: round1(n) });
            }
          }}
          onBlur={() => {
            setFocused(false);
            const raw = draft.trim();
            if (!raw) {
              onChange({ ...format, fontSize: undefined });
              setDraft("");
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n)) {
              // Invalid input: revert to the last committed value.
              setDraft(format.fontSize != null ? round1(format.fontSize).toString() : "");
              return;
            }
            const clamped = Math.max(SIZE_MIN, Math.min(upper, n));
            const rounded = round1(clamped);
            onChange({ ...format, fontSize: rounded });
            setDraft(rounded.toString());
          }}
        />
      </div>

      <div className="format-row align-row">
        <span className="align-axis">H</span>
        <div className="align-grid" role="group" aria-label="Horizontal alignment">
          {H_OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`align-btn${format.hAlign === o.v ? " active" : ""}`}
              aria-pressed={format.hAlign === o.v}
              aria-label={o.title}
              onClick={() => onChange({ ...format, hAlign: o.v })}
              title={o.title}
            >
              {o.icon}
            </button>
          ))}
        </div>
        <span className="align-axis">V</span>
        <div className="align-grid" role="group" aria-label="Vertical alignment">
          {V_OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`align-btn${format.vAlign === o.v ? " active" : ""}`}
              aria-pressed={format.vAlign === o.v}
              aria-label={o.title}
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