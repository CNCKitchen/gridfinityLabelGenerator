import type { LabelInput } from "../types/label";

// Label DXF paths extracted from label.svg (Inkscape DXF export, 96 dpi).
// LABEL_TRANSFORM maps local px → overlay mm (0..37.8 × 0..11.5):
//   scale(0.264583) translate(137.19, -1120.59)
// Local extents: x -137.19..5.67 (37.8mm), y 1120.59..1164.06 (11.5mm)
const LABEL_TRANSFORM = "scale(0.264583) translate(137.19, -1120.59)";

// The screw SVG (screw_lowHead.svg) has an A4-sized viewBox (793×1122).
// The actual screw path occupies approx x:34.72..110.31, y:19.17..34.29 (75.6×15.1px ≈ 5:1 AR).
// This viewBox crops to that area with a small margin, matching LINE2_BOX AR (~5:1).
const SCREW_SVG_VIEWBOX = "32.4 18.7 80.2 16";

// Full label coordinate space (0..37.8 × 0..11.5 mm), derived from STL bounding box.
// SVG Y increases downward; 3D Y increases upward — boxes are pre-flipped.
const LABEL_W = 37.8;
const LABEL_H = 11.5;

const ICON_BOX  = { x: 3.0,  y: 1.0,  w: 9.5,  h: 9.5  };
const LINE1_BOX = { x: 13.5, y: 1.0,  w: 21.3, h: 4.25 }; // top half
const LINE2_BOX = { x: 13.5, y: 6.25, w: 21.3, h: 4.25 }; // bottom half

// Outer viewBox adds 1mm margin on all sides so the label outline stroke isn't clipped
const VB_MARGIN = 1;
const VB = `${-VB_MARGIN} ${-VB_MARGIN} ${LABEL_W + VB_MARGIN * 2} ${LABEL_H + VB_MARGIN * 2}`;

const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const ICON_GAP = 0.4; // mm between TX and number halves — keeps them visually tight

function fittingFontSize(text: string, maxW: number, maxH: number): number {
  const len = text.length || 1;
  return Math.min((maxW * 1.7) / len, maxH);
}

interface LabelPreviewProps {
  label: LabelInput | null;
}

export function LabelPreview({ label }: LabelPreviewProps) {
  function renderLabelShape() {
    // Paths from label.svg, scaled to overlay mm via:  scale(0.264583) translate(137.19, -1120.59)
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

  function renderLine1() {
    if (!label?.line1) return null;
    const fs = fittingFontSize(label.line1, LINE1_BOX.w, LINE1_BOX.h);
    return (
      <text
        x={LINE1_BOX.x + LINE1_BOX.w / 2}
        y={LINE1_BOX.y + LINE1_BOX.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fs}
        fill="#e2e8f0"
        fontWeight="bold"
        fontFamily={FONT}
      >
        {label.line1}
      </text>
    );
  }

  function renderLine2() {
    if (!label) return null;

    if (label.line2Svg) {
      // Use a nested <svg> with a viewBox cropped to the actual content area.
      // label.line2ViewBox overrides the default SCREW_SVG_VIEWBOX for TRP images.
      const vb = label.line2ViewBox ?? SCREW_SVG_VIEWBOX;
      const encoded = encodeURIComponent(label.line2Svg);
      return (
        <svg
          x={LINE2_BOX.x}
          y={LINE2_BOX.y}
          width={LINE2_BOX.w}
          height={LINE2_BOX.h}
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
    const fs = fittingFontSize(label.line2, LINE2_BOX.w, LINE2_BOX.h);
    return (
      <text
        x={LINE2_BOX.x + LINE2_BOX.w / 2}
        y={LINE2_BOX.y + LINE2_BOX.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fs}
        fill="#e2e8f0"
        fontWeight="bold"
        fontFamily={FONT}
      >
        {label.line2}
      </text>
    );
  }

  return (
    <svg
      className="preview-svg"
      viewBox={VB}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Safari-compatible white filter for SVG <image> elements */}
        <filter id="lp-to-white">
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
        </filter>
      </defs>
      {renderLabelShape()}
      {renderIcon()}
      {renderLine1()}
      {renderLine2()}
    </svg>
  );
}

