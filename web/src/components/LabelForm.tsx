import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomIconMeta, ImageAsset, LabelInput, TextFormat } from "../types/label";

import { TextFormatControls } from "./TextFormatControls";
import { buildCustomIcon, loadCustomIcons, removeCustomIcon, saveCustomIcons } from "../services/iconStore";
import { resolveLineBoxes } from "../services/geometry";
import { maxFittingSizeComposed, parseLineTemplate, type LineToken } from "../services/textMetrics";
import { BUILTIN_IMAGES, CLIPART_IMAGES } from "../services/imageRegistry";

const DEFAULT_FORMAT: TextFormat = { autoSize: true, hAlign: "center", vAlign: "center" };

// '×' (U+00D7) is not supported by the STL font. Normalise any typed/pasted
// multiplication sign to a plain lowercase 'x' at the input boundary.
const sanitizeLabelText = (s: string): string => s.replace(/[\u00d7]/g, "x");

// Template refs are resolved in titles/filenames to their plain name.
const templateToPlain = (s: string): string =>
  sanitizeLabelText(s).replace(/\$\{([^}]*)\}/g, "$1").replace(/\s+/g, " ").trim();

/** Largest manual size that still fits the composed line box (measured, = STL auto). */
function useFitMax(tokens: LineToken[], box: { w: number; h: number }, registry: ImageAsset[]): number | null {
  const [fit, setFit] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    if (tokens.length === 0) {
      setFit(null);
      return;
    }
    const w = box.w;
    const h = box.h;
    (async () => {
      let v: number;
      try {
        v = await maxFittingSizeComposed(tokens, w, h, registry);
      } catch {
        const chars = tokens.reduce((n, t) => n + (t.type === "text" ? t.text.length : 4), 0) || 1;
        v = Math.max(1.2, Math.min(h, (w * 1.7) / chars));
      }
      if (alive) setFit(v);
    })();
    return () => {
      alive = false;
    };
  }, [tokens, box.w, box.h, registry]);
  return fit;
}

/**
 * Collapsible list of every embeddable image. Clicking one inserts the
 * `${Name}` reference into the owning line at the current caret.
 */
function ImageInsertList({ assets, onInsert }: { assets: ImageAsset[]; onInsert: (name: string) => void }) {
  return (
    <details className="image-insert">
      <summary>Insert image…</summary>
      <div className="image-insert-grid">
        {assets.map((a) => (
          <button
            key={`${a.id}:${a.name}`}
            type="button"
            className="image-insert-item"
            onClick={() => onInsert(a.name)}
            title={`Insert \${${a.name}}`}
          >
            <svg
              viewBox={a.viewBox || "0 0 100 100"}
              width="26"
              height="26"
              preserveAspectRatio="xMidYMid meet"
              style={{ filter: "invert(1)" }}
            >
              <image
                href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(a.svg)}`}
                x="0"
                y="0"
                width="793.70079"
                height="1122.5197"
              />
            </svg>
            <span>{a.name}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

interface LabelFormProps {
  onGenerate: (input: LabelInput) => Promise<void>;
  onPreviewChange?: (label: LabelInput) => void;
  isActive?: boolean;
  onActivate?: () => void;
}

export function LabelForm({ onGenerate, onPreviewChange, isActive, onActivate }: LabelFormProps) {
  const [line1, setLine1] = useState("M3x10");
  const [line2, setLine2] = useState("Screw");
  const [selectedClipart, setSelectedClipart] = useState<string | null>("torx");
  const [labelWidth, setLabelWidth] = useState<1 | 2 | 3>(1);
  const [line2Enabled, setLine2Enabled] = useState(true);
  const [line1Format, setLine1Format] = useState<TextFormat>(DEFAULT_FORMAT);
  const [line2Format, setLine2Format] = useState<TextFormat>(DEFAULT_FORMAT);
  const [customIcons, setCustomIcons] = useState<CustomIconMeta[]>(() => loadCustomIcons());
  const [importError, setImportError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Cursor position of each line input, captured on select/click, for inserting
  // ${Name} exactly where the user is typing.
  const line1InputRef = useRef<HTMLInputElement>(null);
  const line2InputRef = useRef<HTMLInputElement>(null);
  const selLine1 = useRef(0);
  const selLine2 = useRef(0);
  const [pendingCaret, setPendingCaret] = useState<{ line: 1 | 2; pos: number } | null>(null);

  // Persist custom icons whenever they change (central place — keeps state
  // updaters pure). The first render is skipped so we never overwrite the stored
  // icons with the already-populated initial state.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveCustomIcons(customIcons);
  }, [customIcons]);

  // Registry of every embeddable image: imported icons first (so a same-named
  // user icon shadows a built-in), then all built-ins. Stable across renders.
  const registry = useMemo<ImageAsset[]>(
    () => [...customIcons.map((c) => ({ id: c.id, name: c.name, svg: c.svg, viewBox: c.viewBox })), ...BUILTIN_IMAGES],
    [customIcons]
  );
  const allCliparts = useMemo<ImageAsset[]>(() => [...CLIPART_IMAGES, ...customIcons], [customIcons]);

  // Effective boxes + measured manual-size caps for the text lines.
  const hasIcon = selectedClipart !== null;
  const hasLine1 = line1.trim().length > 0;
  const hasLine2 = line2Enabled && line2.trim().length > 0;
  const fitBoxes = resolveLineBoxes(labelWidth, hasIcon, hasLine1, hasLine2);
  const line1Tokens = useMemo(() => parseLineTemplate(line1), [line1]);
  const line2Tokens = useMemo(() => parseLineTemplate(line2), [line2]);
  const line1Max = useFitMax(line1Tokens, fitBoxes.line1, registry);
  const line2Max = useFitMax(line2Tokens, fitBoxes.line2, registry);

  function buildLabel(): LabelInput {
    const line1Out = sanitizeLabelText(line1);
    const line2Out = sanitizeLabelText(line2);
    const clip = allCliparts.find((c) => c.id === selectedClipart);
    const iconSvg = clip?.svg ?? "";
    const iconViewBox = clip?.viewBox;
    const on = line2Enabled;
    const formats = {
      line1Format: { ...line1Format },
      line2Format: { ...line2Format },
    };
    const title = templateToPlain(on ? [line1Out, line2Out].filter(Boolean).join(" ") : line1Out);
    return {
      title,
      line1: line1Out,
      line2: on ? line2Out : "",
      iconSvg,
      iconViewBox,
      labelWidth,
      line2Enabled: on,
      icons: registry,
      ...formats,
    };
  }

  // Emit preview on every change, and once on mount
  useEffect(() => {
    if (!onPreviewChange) return;
    onPreviewChange(buildLabel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line1, line2, selectedClipart, labelWidth, line2Enabled, line1Format, line2Format, customIcons, onPreviewChange]);

  // Restore the text caret right after an image insert so the user can keep typing.
  useEffect(() => {
    if (!pendingCaret) return;
    const input = pendingCaret.line === 1 ? line1InputRef.current : line2InputRef.current;
    if (input) {
      input.focus();
      try {
        input.setSelectionRange(pendingCaret.pos, pendingCaret.pos);
      } catch {
        /* not focusable */
      }
    }
    setPendingCaret(null);
  }, [pendingCaret]);

  const insertImage = (line: 1 | 2, name: string) => {
    const value = line === 1 ? line1 : line2;
    const sel = line === 1 ? selLine1.current : selLine2.current;
    const token = `\${${name}} `;
    const pos = Math.max(0, Math.min(sel, value.length));
    const next = value.slice(0, pos) + token + value.slice(pos);
    const setter = line === 1 ? setLine1 : setLine2;
    setter(sanitizeLabelText(next));
    setPendingCaret({ line, pos: pos + token.length });
  };

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
      const meta = buildCustomIcon(text, name);
      setCustomIcons((cur) => [...cur, meta]);
      setSelectedClipart(meta.id);
    } catch {
      setImportError("Could not read the SVG file.");
    }
  };

  const handleRemoveIcon = (id: string) => {
    setCustomIcons((cur) => removeCustomIcon(cur, id));
    if (selectedClipart === id) setSelectedClipart(null);
  };

  const trackCaret1 = (e: React.FormEvent<HTMLInputElement>) => {
    selLine1.current = e.currentTarget.selectionStart ?? selLine1.current;
  };
  const trackCaret2 = (e: React.FormEvent<HTMLInputElement>) => {
    selLine2.current = e.currentTarget.selectionStart ?? selLine2.current;
  };

  return (
    <form className={`panel${isActive ? " panel-active" : ""}`} onSubmit={handleSubmit} onFocus={handleFocusEnter} onPointerDown={() => onActivate?.()}>
      <h2>Create Your Own Label</h2>

      <label>
        Line 1
        <input
          value={line1}
          ref={line1InputRef}
          onChange={(e) => setLine1(sanitizeLabelText(e.target.value))}
          onSelect={trackCaret1}
          onClick={trackCaret1}
          onKeyUp={trackCaret1}
          required
        />
      </label>
      <ImageInsertList assets={registry} onInsert={(n) => insertImage(1, n)} />
      <TextFormatControls label="Line 1 format" format={line1Format} onChange={setLine1Format} maxSize={line1Max ?? undefined} />

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
        </div>
        {line2Enabled && (
          <>
            <input
              value={line2}
              ref={line2InputRef}
              onChange={(e) => setLine2(sanitizeLabelText(e.target.value))}
              onSelect={trackCaret2}
              onClick={trackCaret2}
              onKeyUp={trackCaret2}
            />
            <ImageInsertList assets={registry} onInsert={(n) => insertImage(2, n)} />
            <TextFormatControls label="Line 2 format" format={line2Format} onChange={setLine2Format} maxSize={line2Max ?? undefined} />
          </>
        )}
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
          {CLIPART_IMAGES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`symbol-item${selectedClipart === c.id ? " selected" : ""}`}
              onClick={() => setSelectedClipart((prev) => (prev === c.id ? null : c.id))}
              title={c.name}
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