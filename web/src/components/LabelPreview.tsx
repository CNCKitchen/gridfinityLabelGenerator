import { useEffect, useMemo, useState } from "react";
import type { ImageAsset, LabelInput, TextFormat } from "../types/label";
import {
  clampManualSize,
  DEFAULT_TEXT_FORMAT,
  hAlignOffset,
  labelExtraWidth,
  labelPhysicalWidth,
  resolveLineBoxes,
  vAlignOffset,
  type Box2,
} from "../services/geometry";
import { BUILTIN_IMAGES } from "../services/imageRegistry";
import {
  ensureTextFont,
  layoutComposed,
  maxFittingSizeComposed,
  parseLineTemplate,
  textToSvgPath,
  type LineToken,
} from "../services/textMetrics";

// Label DXF paths extracted from label.svg (Inkscape DXF export, 96 dpi).
// LABEL_TRANSFORM maps local px → overlay mm (0..37.8 × 0..11.5):
//   scale(0.264583) translate(137.19, -1120.59)
const LABEL_TRANSFORM = "scale(0.264583) translate(137.19, -1120.59)";

// Full label coordinate space (0..LABEL_BASE_W × 0..11.5 mm), SVG Y downward.
const LABEL_BASE_W = 37.8;
const LABEL_H = 11.5;

// The screw SVG (screw_lowHead.svg) has an A4-sized viewBox (793×1122).
const SCREW_SVG_VIEWBOX = "32.4 18.7 80.2 16";

// Legacy fixed icon box (catalog labels that pass iconSvg/iconText).
const LEGACY_ICON_BOX = { x: 3.0, y: 1.0, w: 9.5, h: 9.5 };
// The large left icon row renders its icons at this height (from `${...}` refs).
const ICON_AREA_H = 9.5;
const LEGACY_ICON_WIDTH = 9.5;

const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const ICON_GAP = 0.4; // mm between TX and number halves — keeps them visually tight

// Fallback used only until the measured font size resolves (brief flash).
function fittingFontSize(tokens: LineToken[], maxW: number, maxH: number): number {
  const chars = tokens.reduce((n, t) => n + (t.type === "text" ? t.text.length : 8), 0) || 1;
  return Math.max(1.2, Math.min((maxW * 1.7) / chars, maxH));
}

interface LabelPreviewProps {
  label: LabelInput | null;
}

export function LabelPreview({ label }: LabelPreviewProps) {
  const labelWidth = label?.labelWidth ?? 1;
  const extraW = labelExtraWidth(labelWidth);
  const labelW = labelPhysicalWidth(labelWidth);

  const registry = label?.icons ?? BUILTIN_IMAGES;
  const hasLegacyIcon = !!(label?.iconSvg || label?.iconText);
  const symbolTokens = useMemo(() => (label?.symbol ? parseLineTemplate(label.symbol) : []), [label?.symbol]);
  const hasSymbol = !!(label?.symbol && label.symbol.trim());

  // The icon-row width for a text-bearing symbol depends on measured glyphs, so
  // recompute it once the font is ready (the sync memo is stale before that).
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    ensureTextFont().then(() => alive && setFontReady(true)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Effective boxes + sizes. The left icon-row width shifts the text boxes.
  const iconRowWidth = useMemo(() => {
    if (label?.symbol && label.symbol.trim()) return layoutComposed(symbolTokens, ICON_AREA_H, registry).totalWidth;
    return hasLegacyIcon ? LEGACY_ICON_WIDTH : 0;
  }, [symbolTokens, registry, label?.symbol, hasLegacyIcon, fontReady]);

  const hasLine1 = !!label?.line1?.trim();
  const line2Enabled = label ? label.line2Enabled !== false : true;
  const hasLine2 = line2Enabled && !!(label && (label.line2Svg || label.line2.trim()));
  const boxes = resolveLineBoxes(labelWidth, iconRowWidth, hasLine1, hasLine2);
  const line1Tokens = useMemo(() => parseLineTemplate(label?.line1 ?? ""), [label?.line1]);
  const line2Tokens = useMemo(() => parseLineTemplate(label?.line2 ?? ""), [label?.line2]);
  const line1Size = useResolvedComposedSize(line1Tokens, boxes.line1, label?.line1Format, registry);
  const line2Size = useResolvedComposedSize(line2Tokens, boxes.line2, label?.line2Format, registry);

  // Outer viewBox adds 1mm margin on all sides so the label outline stroke isn't clipped
  const VB_MARGIN = 1;
  const VB = `${-VB_MARGIN} ${-VB_MARGIN} ${labelW + VB_MARGIN * 2} ${LABEL_H + VB_MARGIN * 2}`;

  // Stretch factor for the fixed body outline (see note in resolveLineBoxes).
  const bodyScaleX = labelW / LABEL_BASE_W;

  function renderLabelShape() {
    return (
      <g transform={LABEL_TRANSFORM} strokeLinecap="round" strokeLinejoin="round">
        {/* Outer body (main rectangle + side tabs) */}
        <path
          d="M 5.669669,1131.5528 H 1.889764 v -7.5591 a 3.401575,3.401575 0 0 0 -3.401575,-3.4016 H -130.01575 a 3.401575,3.401575 0 0 0 -3.40157,3.4016 v 7.5591 h -3.77991 v 21.5433 h 3.77991 v 7.559 a 3.401575,3.401575 0 0 0 3.40157,3.4016 H -1.511811 a 3.401575,3.401575 0 0 0 3.401575,-3.4016 v -7.559 h 3.779905 z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.89"
        />
        {/* Inner printed area */}
        <path
          d="m -130.01575,1122.4819 a 1.511811,1.511811 0 0 0 -1.51181,1.5118 v 10.7128 a 3.779528,3.779528 0 0 0 2.09974,3.3858 4.724409,4.724409 0 0 1 0,8.4643 3.779528,3.779528 0 0 0 -2.09974,3.3857 v 10.7128 a 1.511811,1.511811 0 0 0 1.51181,1.5118 H -1.511811 A 1.511811,1.511811 0 0 0 0,1160.6551 v -10.7128 a 3.779528,3.779528 0 0 0 -2.099738,-3.3857 4.724409,4.724409 0 0 1 0,-8.4643 A 3.779528,3.779528 0 0 0 0,1134.7065 v -10.7128 a 1.511811,1.511811 0 0 0 -1.511811,-1.5118 z"
          fill="#0f172a"
          stroke="none"
        />
        {/* Left mounting pin */}
        <path
          d="m -128.69291,1142.3244 a 2.834646,2.834646 0 0 0 -5.66929,0 2.834646,2.834646 0 0 0 5.66929,0 z"
          fill="none"
          stroke="#475569"
          strokeWidth="1.89"
        />
        {/* Right mounting pin */}
        <path
          d="m 2.834646,1142.3244 a 2.834646,2.834646 0 0 0 -5.669292,0 2.834646,2.834646 0 0 0 5.669292,0 z"
          fill="none"
          stroke="#475569"
          strokeWidth="1.89"
        />
      </g>
    );
  }

  function renderIcon() {
    if (!label) return null;

    // Large left symbol/icon row, defined by a template like "${Hex}".
    if (hasSymbol) {
      return renderComposedLine(
        symbolTokens,
        { x: 3.0, y: 1.0, w: iconRowWidth, h: ICON_AREA_H },
        { autoSize: true, hAlign: "left", vAlign: "center" },
        ICON_AREA_H,
        registry
      );
    }

    if (label.iconText) {
      const match = label.iconText.match(/^([A-Za-z]+)(\d+.*)$/);
      const parts = match ? [match[1], match[2]] : [label.iconText];
      const partH = (LEGACY_ICON_BOX.h - (parts.length > 1 ? ICON_GAP : 0)) / parts.length;
      return parts.map((part, i) => {
        const partY = LEGACY_ICON_BOX.y + i * (partH + ICON_GAP);
        const fs = Math.min((LEGACY_ICON_BOX.w * 1.7) / (part.length || 1), partH);
        return (
          <text
            key={i}
            x={LEGACY_ICON_BOX.x + LEGACY_ICON_BOX.w / 2}
            y={partY + partH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fs}
            fill="#e2e8f0"
            fontWeight="bold"
            fontFamily={FONT}
          >
            {part}
          </text>
        );
      });
    }

    if (label.iconSvg) {
      const encoded = encodeURIComponent(label.iconSvg);
      if (label.iconViewBox) {
        return (
          <svg
            x={LEGACY_ICON_BOX.x}
            y={LEGACY_ICON_BOX.y}
            width={LEGACY_ICON_BOX.w}
            height={LEGACY_ICON_BOX.h}
            viewBox={label.iconViewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="icon-to-white">
                <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
              </filter>
            </defs>
            <image
              href={`data:image/svg+xml;charset=utf-8,${encoded}`}
              x="0"
              y="0"
              width="793.70079"
              height="1122.5197"
              filter="url(#icon-to-white)"
            />
          </svg>
        );
      }
      return (
        <image
          href={`data:image/svg+xml;charset=utf-8,${encoded}`}
          x={LEGACY_ICON_BOX.x}
          y={LEGACY_ICON_BOX.y}
          width={LEGACY_ICON_BOX.w}
          height={LEGACY_ICON_BOX.h}
          preserveAspectRatio="xMidYMid meet"
          filter="url(#lp-to-white)"
        />
      );
    }

    return null;
  }

  function renderLine1() {
    if (!label?.line1 || line1Size == null) return null;
    return renderComposedLine(line1Tokens, boxes.line1, label.line1Format, line1Size, registry);
  }

  function renderLine2() {
    if (!label) return null;
    if (!hasLine2) return null;
    if (label.line2Svg) {
      const encoded = encodeURIComponent(label.line2Svg);
      const box = boxes.line2;
      return (
        <svg
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          viewBox={label.line2ViewBox ?? SCREW_SVG_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="line2-to-white">
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
            </filter>
          </defs>
          <image
            href={`data:image/svg+xml;charset=utf-8,${encoded}`}
            x="0"
            y="0"
            width="793.70079"
            height="1122.5197"
            filter="url(#line2-to-white)"
          />
        </svg>
      );
    }
    if (!label.line2 || line2Size == null) return null;
    return renderComposedLine(line2Tokens, boxes.line2, label.line2Format, line2Size, registry);
  }

  return (
    <svg className="preview-svg" viewBox={VB} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="lp-to-white">
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
        </filter>
      </defs>
      <g transform={`scale(${bodyScaleX}, 1)`}>{renderLabelShape()}</g>
      {renderIcon()}
      {renderLine1()}
      {renderLine2()}
    </svg>
  );
}

/**
 * Resolves the effective font size for a template line: the biggest size whose
 * whole composed chain (text ink + inline images + spaces) fits the box (== the
 * STL auto-size), or the manual size clamped to that same limit. Async.
 */
function useResolvedComposedSize(
  tokens: LineToken[],
  box: Box2,
  format: TextFormat | undefined,
  registry: ImageAsset[]
): number | null {
  const [size, setSize] = useState<number | null>(null);
  const regKey = useMemo(() => registry.map((a) => a.id).join("|"), [registry]);
  useEffect(() => {
    let alive = true;
    if (tokens.length === 0) {
      setSize(null);
      return;
    }
    const w = box.w;
    const h = box.h;
    (async () => {
      let auto: number;
      try {
        auto = await maxFittingSizeComposed(tokens, w, h, registry);
      } catch {
        auto = fittingFontSize(tokens, w, h);
      }
      if (!alive) return;
      if (!format || format.autoSize !== false) {
        setSize(auto);
      } else {
        setSize(clampManualSize(format.fontSize ?? auto, 1.2, auto));
      }
    })();
    return () => {
      alive = false;
    };
    // regKey (stable, content-derived) rather than the registry reference: custom
    // icons are immutable, so a new id always signals changed geometry.
  }, [tokens, box.w, box.h, format?.autoSize, format?.fontSize, regKey]);
  return size;
}

/**
 * Renders a template string as a row of text glyph paths and inline `${Name}`
 * images, laid out with the shared textMetrics module so it matches the STL:
 * same advance/width (spaces preserved), icons the same size as the glyphs, all
 * tokens centred on the content's vertical centre.
 */
function renderComposedLine(
  tokens: LineToken[],
  box: Box2,
  format: TextFormat | undefined,
  size: number,
  registry: ImageAsset[]
) {
  const layout = layoutComposed(tokens, size, registry);
  if (!layout.tokens.length) return null;
  const fmt = format ?? DEFAULT_TEXT_FORMAT;
  const dx = hAlignOffset(fmt.hAlign, box.w, layout.totalWidth);
  const dy = vAlignOffset(fmt.vAlign, box.h, layout.contentHeight, false);
  const centerY = layout.contentHeight / 2;

  const children: import("react").ReactNode[] = [];
  let cursor = 0;
  for (const t of layout.tokens) {
    if (t.type === "text" && t.text && t.ink) {
      const d = textToSvgPath(t.text.trim(), size);
      const inkTopY = centerY - t.height / 2;
      // textToSvgPath already flips y (natural top = -(ink.y+ink.height));
      // bring that top edge to inkTopY, and the ink left to cursor+prePad.
      const tx = cursor + t.prePad - t.ink.x;
      const ty = inkTopY + (t.ink.y + t.ink.height);
      children.push(<path key={`t${children.length}`} d={d} transform={`translate(${tx} ${ty})`} fill="#e2e8f0" fillRule="evenodd" />);
    } else if (t.type === "image" && t.asset) {
      const vb = t.asset.viewBox || "0 0 100 100";
      const yTop = centerY - t.height / 2;
      children.push(
        <svg key={`i${children.length}`} x={cursor} y={yTop} width={t.width} height={t.height} viewBox={vb} preserveAspectRatio="xMidYMid meet">
          <image
            href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.asset.svg)}`}
            x="0"
            y="0"
            width="793.70079"
            height="1122.5197"
            filter="url(#lp-to-white)"
          />
        </svg>
      );
    }
    cursor += t.width; // spaces are already inside t.width (advance)
  }

  return <g transform={`translate(${box.x + dx} ${box.y + dy})`}>{children}</g>;
}