import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomIconMeta, ImageAsset, LabelInput, TextFormat } from "../types/label";

import { TextFormatControls } from "./TextFormatControls";
import { buildCustomIcon, loadCustomIcons, removeCustomIcon, saveCustomIcons } from "../services/iconStore";
import { resolveLineBoxes } from "../services/geometry";
import { layoutComposed, maxFittingSizeComposed, parseLineTemplate, type LineToken } from "../services/textMetrics";
import { BUILTIN_IMAGES, CLIPART_IMAGES, SCREW_IMAGES } from "../services/imageRegistry";

/** Height (mm) of the large left icon/symbol row — must match the preview. */
const SYMBOL_ICON_H = 9.5;

const DEFAULT_FORMAT: TextFormat = { autoSize: true, hAlign: "center", vAlign: "center" };

const LINE1_DEFAULT = "M3 ${Cylinder Head}";
const LINE2_DEFAULT = "x6   x8   x10";
const SYMBOL_DEFAULT = "${Hex}";

// '×' (U+00D7) is not supported by the STL font. Normalise any typed/pasted
// multiplication sign to a plain lowercase 'x' at the input boundary.
const sanitizeLabelText = (s: string): string => s.replace(/[\u00d7]/g, "x");

// Template refs are resolved in titles/filenames to their plain name.
const templateToPlain = (s: string): string =>
  sanitizeLabelText(s).replace(/\$\{([^}]*)\}/g, "$1").replace(/\s+/g, " ").trim();

/** Best-effort clipboard copy with a textarea fallback for older browsers. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fall through */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta);
}

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
        const chars = tokens.reduce((n, t) => n + (t.type === "text" ? t.text.length : 8), 0) || 1;
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

interface LabelFormProps {
  onGenerate: (input: LabelInput) => Promise<void>;
  onPreviewChange?: (label: LabelInput) => void;
  isActive?: boolean;
  onActivate?: () => void;
}

export function LabelForm({ onGenerate, onPreviewChange, isActive, onActivate }: LabelFormProps) {
  const [symbol, setSymbol] = useState(SYMBOL_DEFAULT);
  const [line1, setLine1] = useState(LINE1_DEFAULT);
  const [line2, setLine2] = useState(LINE2_DEFAULT);
  const [labelWidth, setLabelWidth] = useState<1 | 2 | 3>(1);
  const [line2Enabled, setLine2Enabled] = useState(true);
  const [line1Format, setLine1Format] = useState<TextFormat>(DEFAULT_FORMAT);
  const [line2Format, setLine2Format] = useState<TextFormat>(DEFAULT_FORMAT);
  const [customIcons, setCustomIcons] = useState<CustomIconMeta[]>(() => loadCustomIcons());
  const [importError, setImportError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | null>(null);

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

  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); }, []);

  // Registry of every embeddable image: imported icons first (so a same-named
  // user icon shadows a built-in), then all built-ins. Stable across renders.
  const registry = useMemo<ImageAsset[]>(
    () => [...customIcons.map((c) => ({ id: c.id, name: c.name, svg: c.svg, viewBox: c.viewBox })), ...BUILTIN_IMAGES],
    [customIcons]
  );
  // Everything shown in the clipboard gallery.
  const gallery = useMemo<ImageAsset[]>(
    () => [
      ...CLIPART_IMAGES,
      ...SCREW_IMAGES,
      ...customIcons.map((c) => ({ id: c.id, name: c.name, svg: c.svg, viewBox: c.viewBox })),
    ],
    [customIcons]
  );

  // Effective boxes + measured manual-size caps for the text lines. The left
  // icon-row width (from the Symbol template) shifts the text boxes.
  const symbolTokens = useMemo(() => parseLineTemplate(symbol), [symbol]);
  const hasSymbol = symbol.trim().length > 0;
  const iconRowWidth = useMemo(
    () => (hasSymbol ? layoutComposed(symbolTokens, SYMBOL_ICON_H, registry).totalWidth : 0),
    [symbolTokens, symbol, registry]
  );
  const hasLine1 = line1.trim().length > 0;
  const hasLine2 = line2Enabled && (line2.trim().length > 0);
  const fitBoxes = resolveLineBoxes(labelWidth, iconRowWidth, hasLine1, hasLine2);
  const line1Tokens = useMemo(() => parseLineTemplate(line1), [line1]);
  const line2Tokens = useMemo(() => parseLineTemplate(line2), [line2]);
  const line1Max = useFitMax(line1Tokens, fitBoxes.line1, registry);
  const line2Max = useFitMax(line2Tokens, fitBoxes.line2, registry);

  function buildLabel(): LabelInput {
    const line1Out = sanitizeLabelText(line1);
    const line2Out = sanitizeLabelText(line2);
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
      iconSvg: "",
      symbol: sanitizeLabelText(symbol),
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
  }, [symbol, line1, line2, labelWidth, line2Enabled, line1Format, line2Format, customIcons, onPreviewChange]);

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
    } catch {
      setImportError("Could not read the SVG file.");
    }
  };

  const handleRemoveIcon = (id: string) => {
    setCustomIcons((cur) => removeCustomIcon(cur, id));
  };

  const handleCopyIcon = (name: string) => {
    const token = `\${${name}}`;
    void copyText(token);
    setCopiedHint(`Copied to clipboard...`);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedHint(null), 1500);
  };

  return (
    <form className={`panel${isActive ? " panel-active" : ""}`} onSubmit={handleSubmit} onFocus={handleFocusEnter} onPointerDown={() => onActivate?.()}>
      <h2>Create Your Own Label</h2>
      <p className="insert-hint">
        Insert Icons using their name in the text fields: <code>$&#123;icon name&#125;</code>
      </p>

      <label>
        Symbol
        <input value={symbol} onChange={(e) => setSymbol(sanitizeLabelText(e.target.value))} placeholder='${Hex}' />
      </label>

      <label>
        Line 1
        <input value={line1} onChange={(e) => setLine1(sanitizeLabelText(e.target.value))} required />
      </label>
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
            <input value={line2} onChange={(e) => setLine2(sanitizeLabelText(e.target.value))} />
            <TextFormatControls label="Line 2 format" format={line2Format} onChange={setLine2Format} maxSize={line2Max ?? undefined} />
          </>
        )}
      </div>

      <div className="symbol-section">
        <span>Icons</span>
        <div className="symbol-picker">
          {gallery.map((a) => (
            <div key={`${a.id}:${a.name}`} className={`symbol-item${a.id.startsWith("custom-") ? " custom-symbol" : ""}`}>
              <button
                type="button"
                className="symbol-select"
                onClick={() => handleCopyIcon(a.name)}
                title={`Copy \${${a.name}} to clipboard`}
              >
                <svg
                  viewBox={a.viewBox || "0 0 100 100"}
                  width="40"
                  height="40"
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
              {a.id.startsWith("custom-") && (
                <button
                  type="button"
                  className="symbol-remove"
                  onClick={() => handleRemoveIcon(a.id)}
                  title="Remove icon from this browser"
                >
                  &times;
                </button>
              )}
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
        {copiedHint ? <span className="copied-hint">{copiedHint}</span> : null}
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