import type { LabelInput, TextFormat } from "../types/label";
import { clampManualSize, DEFAULT_TEXT_FORMAT, labelExtraWidth, labelPhysicalWidth } from "../services/geometry";

// Label DXF paths extracted from label.svg (Inkscape DXF export, 96 dpi).
// LABEL_TRANSFORM maps local px → overlay mm (0..37.8 × 0..11.5):
//   scale(0.264583) translate(137.19, -1120.59)
// Local extents: x -137.19..5.67 (37.8mm), y 1120.59..1164.06 (11.5mm)
const LABEL_TRANSFORM = "scale(0.264583) translate(137.19, -1120.59)";

// Full label coordinate space (0..LABEL_BASE_W × 0..11.5 mm), derived from STL bounding box.
// SVG Y increases downward; 3D Y increases upward — boxes are pre-flipped.
const LABEL_BASE_W = 37.8;
const LABEL_H = 11.5;

// The screw SVG (screw_lowHead.svg) has an A4-sized viewBox (793×1122).
// This viewBox crops to the actual screw path area, matching the line-2 box AR (~5:1).
const SCREW_SVG_VIEWBOX = "32.4 18.7 80.2 16";

// Base (1×) boxes. Text boxes widen by labelExtraWidth for 2×/3× labels.
const ICON_BOX = { x: 3.0, y: 1.0, w: 9.5, h: 9.5 };
const LINE1_BOX_BASE = { x: 13.5, y: 1.0, w: 21.3, h: 4.25 };
const LINE2_BOX_BASE = { x: 13.5, y: 6.25, w: 21.3, h: 4.25 };
const FULL_LINE1_BOX_BASE = { x: 3.0, y: 1.0, w: 31.8, h: 4.25 };
const FULL_LINE2_BOX_BASE = { x: 3.0, y: 6.25, w: 31.8, h: 4.25 };
const SINGLE_LINE_BOX_BASE = { x: 13.5, y: 1.0, w: 21.3, h: 9.5 };
const FULL_SINGLE_LINE_BOX_BASE = { x: 3.0, y: 1.0, w: 31.8, h: 9.5 };

const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const ICON_GAP = 0.4; // mm between TX and number halves — keeps them visually tight

function fittingFontSize(text: string, maxW: number, maxH: number): number {
  const len = text.length || 1;
  return Math.min((maxW * 1.7) / len, maxH);
}

interface Box { x: number; y: number; w: number; h: number }

/** Effective per-line font size: auto-fit unless a manual size is set (then clamped to the box). */
function effectiveFontSize(text: string, box: Box, format?: TextFormat): number {
  const auto = fittingFontSize(text, box.w, box.h);
  if (!format || format.autoSize !== false) return auto;
  return clampManualSize(format.fontSize ?? auto, 1.2, auto);
}

interface LabelPreviewProps {
  label: LabelInput | null;
}

export function LabelPreview({ label }: LabelPreviewProps) {
  const labelWidth = label?.labelWidth ?? 1;
  const extraW = labelExtraWidth(labelWidth);
  const labelW = labelPhysicalWidth(labelWidth);

  // Widen every text box (not the icon box) so 2×/3× labels get more text room.
  // (lower-case on purpose: these are per-render derived boxes, not module consts)
  const widen = (b: Box): Box => ({ ...b, w: b.w + extraW });
  const line1Box = widen(LINE1_BOX_BASE);
  const line2Box = widen(LINE2_BOX_BASE);
  const fullLine1Box = widen(FULL_LINE1_BOX_BASE);
  const fullLine2Box = widen(FULL_LINE2_BOX_BASE);
  const singleLineBox = widen(SINGLE_LINE_BOX_BASE);
  const fullSingleLineBox = widen(FULL_SINGLE_LINE_BOX_BASE);

  // Outer viewBox adds 1mm margin on all sides so the label outline stroke isn't clipped
  const VB_MARGIN = 1;
  const VB = `${-VB_MARGIN} ${-VB_MARGIN} ${labelW + VB_MARGIN * 2} ${LABEL_H + VB_MARGIN * 2}`;

  const line2Enabled = label ? label.line2Enabled !== false : true;
  const hasLine2 = line2Enabled && !!(label?.line2Svg || label?.line2?.trim());
  // Stretch factor for the fixed body outline: the whole DXF outline is scaled about
  // the left edge, so on 2×/3× the outline is an approximation (the real STL keeps
  // the left half unscaled and extends only the right half). Icon/text boxes are
  // drawn in absolute mm and are unaffected by this scaling.
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

    if (label.iconText) {
      const match = label.iconText.match(/^([A-Za-z]+)(\d+.*)$/);
      const parts = match ? [match[1], match[2]] : [label.iconText];
      const partH = (ICON_BOX.h - (parts.length > 1 ? ICON_GAP : 0)) / parts.length;
      return parts.map((part, i) => {
        const partY = ICON_BOX.y + i * (partH + ICON_GAP);
        const fs = Math.min((ICON_BOX.w * 1.7) / (part.length || 1), partH);
        return (
          <text
            key={i}
            x={ICON_BOX.x + ICON_BOX.w / 2}
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
            x={ICON_BOX.x}
            y={ICON_BOX.y}
            width={ICON_BOX.w}
            height={ICON_BOX.h}
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
          x={ICON_BOX.x}
          y={ICON_BOX.y}
          width={ICON_BOX.w}
          height={ICON_BOX.h}
          preserveAspectRatio="xMidYMid meet"
          filter="url(#lp-to-white)"
        />
      );
    }

    return null;
  }

  /** One justified text line honouring the 3×3 alignment grid within `box`. */
  function renderTextLine(text: string, box: Box, format?: TextFormat) {
    const fs = effectiveFontSize(text, box, format);
    const fmt = format ?? DEFAULT_TEXT_FORMAT;

    const hAnchor = fmt.hAlign === "left" ? "start" : fmt.hAlign === "right" ? "end" : "middle";
    const x =
      fmt.hAlign === "left" ? box.x : fmt.hAlign === "right" ? box.x + box.w : box.x + box.w / 2;
    // SVG Y grows downward: top → text-before-edge at box.y, bottom → text-after-edge at box.y+h.
    const baseline =
      fmt.vAlign === "top" ? "text-before-edge" : fmt.vAlign === "bottom" ? "text-after-edge" : "central";
    const y =
      fmt.vAlign === "top" ? box.y : fmt.vAlign === "bottom" ? box.y + box.h : box.y + box.h / 2;

    return (
      <text
        x={x}
        y={y}
        textAnchor={hAnchor}
        dominantBaseline={baseline}
        fontSize={fs}
        fill="#e2e8f0"
        fontWeight="bold"
        fontFamily={FONT}
      >
        {text}
      </text>
    );
  }

  function renderLine1() {
    if (!label?.line1) return null;
    const hasIcon = !!(label.iconSvg || label.iconText);
    const isOnlyLine = !hasLine2;
    const box = isOnlyLine ? (hasIcon ? singleLineBox : fullSingleLineBox) : hasIcon ? line1Box : fullLine1Box;
    return renderTextLine(label.line1, box, label.line1Format);
  }

  function renderLine2() {
    if (!label) return null;
    if (!hasLine2) return null;
    const hasIcon = !!(label.iconSvg || label.iconText);
    const isOnlyLine = !label.line1;

    if (label.line2Svg) {
      const svgBox = isOnlyLine
        ? hasIcon ? singleLineBox : fullSingleLineBox
        : hasIcon ? line2Box : fullLine2Box;
      const vb = label.line2ViewBox ?? SCREW_SVG_VIEWBOX;
      const encoded = encodeURIComponent(label.line2Svg);
      return (
        <svg
          x={svgBox.x}
          y={svgBox.y}
          width={svgBox.w}
          height={svgBox.h}
          viewBox={vb}
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

    if (!label.line2) return null;
    const box = isOnlyLine
      ? hasIcon ? singleLineBox : fullSingleLineBox
      : hasIcon ? line2Box : fullLine2Box;
    return renderTextLine(label.line2, box, label.line2Format);
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