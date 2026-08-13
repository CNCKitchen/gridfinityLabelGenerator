import {
  Box3,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshNormalMaterial,
  Shape,
  ShapeGeometry,
  ShapePath,
  type BufferGeometry,
} from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { LabelInput, TextFormat } from "../types/label";
import {
  clampManualSize,
  DEFAULT_TEXT_FORMAT,
  extendRectRight,
  hAlignOffset,
  vAlignOffset,
} from "./geometry";

const EMBOSS_HEIGHT = 0.4;

// Tighter letter spacing: each glyph's horizontal advance is reduced by this
// factor. Glyphs themselves are unchanged (no squishing), only the gaps between
// them shrink. The smaller total width lets chooseTextSizeForBox pick a larger
// font size, making strokes proportionally thicker — important for sliceability.
const TRACKING = 0.95;

const SVG_BOX = { x1: 1.5, y1: 0.5, x2: 11, y2: 10 };
const TEXT_TOP_BOX = { x1: 11, y1: 5.75, x2: 34.5, y2: 10 };
const TEXT_BOTTOM_BOX = { x1: 11, y1: 0.5, x2: 34.5, y2: 4.75 };
const TEXT_TOP_BOX_NO_ICON = { x1: 1.5, y1: 5.75, x2: 34.5, y2: 10 };
const TEXT_BOTTOM_BOX_NO_ICON = { x1: 1.5, y1: 0.5, x2: 34.5, y2: 4.75 };
// When only one text line is used it may span the label's full height
const TEXT_SINGLE_BOX = { x1: 11, y1: 0.5, x2: 34.5, y2: 10 };
const TEXT_SINGLE_BOX_NO_ICON = { x1: 1.5, y1: 0.5, x2: 34.5, y2: 10 };

type Rect = { x1: number; y1: number; x2: number; y2: number };

const material = new MeshNormalMaterial();
const stlLoader = new STLLoader();
const svgLoader = new SVGLoader();
const exporter = new STLExporter();

// Lazy-initialized state
let _init: Promise<void> | null = null;
let baseGeometry: BufferGeometry;
let topZ: number;
let CONTENT_ORIGIN_X: number;
let CONTENT_ORIGIN_Y: number;
let font: Font;

// Per-call offset: shifts content right to centre it on wider labels.
// With width-scaled text boxes (extendRectRight) this stays 0; the extra space
// belongs to the text areas, not to symmetric centring.
let contentXOffset = 0;
// Extra width added for the current 2×/3× request, used to grow the text boxes.
let currentExtraWidth = 0;

function ensureInitialized(): Promise<void> {
  if (_init) return _init;
  const base = import.meta.env.BASE_URL;
  _init = (async () => {
    const [stlResp, fontResp] = await Promise.all([
      fetch(`${base}GridfinityBinLabel.stl`),
      fetch(`${base}helvetiker_bold.typeface.json`),
    ]);
    if (!stlResp.ok || !fontResp.ok) {
      throw new Error("Failed to load label assets");
    }
    baseGeometry = stlLoader.parse(await stlResp.arrayBuffer());
    baseGeometry.computeBoundingBox();
    const bounds = baseGeometry.boundingBox ?? new Box3();
    topZ = bounds.max.z;
    CONTENT_ORIGIN_X = bounds.min.x + 1.5;
    CONTENT_ORIGIN_Y = bounds.min.y + 0.5;
    font = new FontLoader().parse(await fontResp.json());
  })();
  return _init;
}

function cloneBaseMesh(): Mesh<BufferGeometry> {
  return new Mesh(baseGeometry.clone(), material);
}

// Generates Three.js shapes for `text` at `size` with reduced letter spacing.
// Replicates Three.js FontLoader's internal createPaths logic so we can apply
// a custom tracking multiplier to each glyph's horizontal advance (ha).
interface GlyphOverride {
  char: string;
  make: (size: number, offsetX: number) => { shapes: Shape[]; advance: number };
}

/**
 * Synthesized glyphs for characters missing from the bundled typeface.
 * Keeps the font file untouched and stays robust (no binary font editing).
 */
const GLYPH_OVERRIDES: GlyphOverride[] = [
  {
    // "×" (multiplication sign): two crossed bars, unioned by ExtrudeGeometry.
    char: "\u00d7",
    make: (size, offsetX) => {
      const a = size * 0.38; // half length
      const b = size * 0.1; // half bar width
      const bars: Shape[] = [];
      const dirs: Array<[number, number]> = [
        [Math.SQRT1_2, Math.SQRT1_2], // +45°
        [Math.SQRT1_2, -Math.SQRT1_2], // -45°
      ];
      for (const [ux, uy] of dirs) {
        const px = -uy;
        const py = ux; // perpendicular
        const shape = new Shape();
        const cx = offsetX;
        const corners: Array<[number, number]> = [
          [cx + a * ux + b * px, a * uy + b * py],
          [cx + a * ux - b * px, a * uy - b * py],
          [cx - a * ux - b * px, -a * uy - b * py],
          [cx - a * ux + b * px, -a * uy + b * py],
        ];
        shape.moveTo(corners[0][0], corners[0][1]);
        shape.lineTo(corners[1][0], corners[1][1]);
        shape.lineTo(corners[2][0], corners[2][1]);
        shape.lineTo(corners[3][0], corners[3][1]);
        shape.closePath();
        bars.push(shape);
      }
      return { shapes: bars, advance: size * 0.75 };
    },
  },
];

function generateShapesWithTracking(text: string, size: number): Shape[] {
  const data = (font as any).data as {
    resolution: number;
    glyphs: Record<string, { ha: number; o?: string; _cachedOutline?: string[] }>;
  };
  const scale = size / data.resolution;
  const shapes: Shape[] = [];
  let offsetX = 0;

  for (const char of text) {
    const override = GLYPH_OVERRIDES.find((o) => o.char === char);
    if (override) {
      const { shapes: synth, advance } = override.make(size, offsetX);
      shapes.push(...synth);
      offsetX += advance;
      continue;
    }

    const glyph = data.glyphs[char] ?? data.glyphs["?"];
    if (!glyph) continue;

    if (glyph.o) {
      const path = new ShapePath();
      const outline = glyph._cachedOutline ?? (glyph._cachedOutline = glyph.o.split(" "));
      let i = 0;
      while (i < outline.length) {
        const action = outline[i++];
        if (action === "m") {
          path.moveTo(+outline[i++] * scale + offsetX, +outline[i++] * scale);
        } else if (action === "l") {
          path.lineTo(+outline[i++] * scale + offsetX, +outline[i++] * scale);
        } else if (action === "q") {
          // typeface.json order: end x/y then control x/y
          const ex = +outline[i++] * scale + offsetX, ey = +outline[i++] * scale;
          const cx = +outline[i++] * scale + offsetX, cy = +outline[i++] * scale;
          path.quadraticCurveTo(cx, cy, ex, ey);
        } else if (action === "b") {
          const ex  = +outline[i++] * scale + offsetX, ey  = +outline[i++] * scale;
          const c1x = +outline[i++] * scale + offsetX, c1y = +outline[i++] * scale;
          const c2x = +outline[i++] * scale + offsetX, c2y = +outline[i++] * scale;
          path.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        }
      }
      shapes.push(...path.toShapes(false));
    }

    offsetX += glyph.ha * scale * TRACKING;
  }

  return shapes;
}

function toExtrudedMesh(shapes: Shape[], depth: number): Mesh {
  const geometry = new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.computeVertexNormals();
  return new Mesh(geometry, material);
}

function getTextBounds(text: string, size: number): Box3 | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const shapes = generateShapesWithTracking(trimmed, size);
  if (shapes.length === 0) return null;
  const geometry = new ShapeGeometry(shapes);
  geometry.computeBoundingBox();
  return geometry.boundingBox;
}

function getMeshBounds(mesh: Mesh): Box3 {
  mesh.updateMatrixWorld(true);
  return new Box3().setFromObject(mesh);
}

function getBoxSize(box: Rect): { width: number; height: number } {
  return { width: box.x2 - box.x1, height: box.y2 - box.y1 };
}

function toWorldBox(box: Rect): Rect {
  return {
    x1: CONTENT_ORIGIN_X + contentXOffset + box.x1,
    y1: CONTENT_ORIGIN_Y + box.y1,
    x2: CONTENT_ORIGIN_X + contentXOffset + box.x2,
    y2: CONTENT_ORIGIN_Y + box.y2,
  };
}

/**
 * Widens a cloned base geometry by shifting all vertices whose X coordinate
 * is right of the geometric midpoint. This extends the flat centre area while
 * keeping both snap-edge profiles intact.
 */
function widenGeometry(geometry: BufferGeometry, extraWidth: number): void {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const threshold = (bounds.min.x + bounds.max.x) / 2;
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getX(i) > threshold) {
      pos.setX(i, pos.getX(i) + extraWidth);
    }
  }
  pos.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
}

function buildSvgMeshInBox(svgString: string, box: Rect): Mesh | null {
  if (!svgString) return null;
  const parsed = svgLoader.parse(svgString);
  const shapes: Shape[] = [];
  for (const p of parsed.paths) {
    shapes.push(...SVGLoader.createShapes(p));
  }
  if (shapes.length === 0) return null;

  const extruded = toExtrudedMesh(shapes, EMBOSS_HEIGHT);
  const sourceBounds = getMeshBounds(extruded);
  const sourceWidth = sourceBounds.max.x - sourceBounds.min.x;
  const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;

  const target = toWorldBox(box);
  const targetSize = getBoxSize(target);
  const scale = Math.min(targetSize.width / sourceWidth, targetSize.height / sourceHeight);

  // SVG assets use screen coordinates where Y grows downward. Rotate the
  // geometry around X instead of using a negative scale so triangle winding
  // stays outward-facing in the exported STL.
  extruded.geometry.rotateX(Math.PI);
  extruded.geometry.scale(scale, scale, 1);
  extruded.geometry.computeVertexNormals();

  const scaledBounds = getMeshBounds(extruded);
  const scaledWidth = scaledBounds.max.x - scaledBounds.min.x;
  const scaledHeight = scaledBounds.max.y - scaledBounds.min.y;
  const tx = target.x1 + (targetSize.width - scaledWidth) / 2 - scaledBounds.min.x;
  const ty = target.y1 + (targetSize.height - scaledHeight) / 2 - scaledBounds.min.y;

  extruded.position.set(tx, ty, topZ);
  return extruded;
}

function buildIconMesh(iconSvg: string): Mesh | null {
  return buildSvgMeshInBox(iconSvg, SVG_BOX);
}

function buildIconTextMeshes(text: string): Mesh[] {
  const target = toWorldBox(SVG_BOX);
  const targetSize = getBoxSize(target);

  // Split e.g. "TX10" → ["TX", "10"] so each part fills its own half and renders larger
  const match = text.match(/^([A-Za-z]+)(\d+.*)$/);
  if (match) {
    const [, prefix, number] = match;
    const GAP = 1.0; // mm gap between the two lines
    const halfHeight = (targetSize.height - GAP) / 2;
    const botY = target.y1;
    const topY = target.y1 + halfHeight + GAP;

    const topSize = chooseTextSizeForBox(prefix, targetSize.width, halfHeight);
    const topMesh = createTextLineMesh(prefix, topSize, target.x1, topY, targetSize.width, halfHeight);

    const botSize = chooseTextSizeForBox(number, targetSize.width, halfHeight);
    const botMesh = createTextLineMesh(number, botSize, target.x1, botY, targetSize.width, halfHeight);

    return [topMesh, botMesh].filter(Boolean) as Mesh[];
  }

  const size = chooseTextSizeForBox(text, targetSize.width, targetSize.height);
  const mesh = createTextLineMesh(text, size, target.x1, target.y1, targetSize.width, targetSize.height);
  return mesh ? [mesh] : [];
}

function chooseTextSizeForBox(text: string, maxWidth: number, maxHeight: number): number {
  // Start high enough that text can fill tall boxes (cap height is ~0.7× the
  // font size); the loop shrinks until the text fits. 6 keeps the classic
  // two-line size for the standard 4.25mm half-height boxes.
  let size = Math.max(6, maxHeight * 1.4);
  const minSize = 1.2;
  while (size > minSize) {
    const bounds = getTextBounds(text, size);
    const width = bounds ? bounds.max.x - bounds.min.x : 0;
    const height = bounds ? bounds.max.y - bounds.min.y : 0;
    if (width <= maxWidth && height <= maxHeight) return size;
    size -= 0.1;
  }
  return minSize;
}

function createTextLineMesh(
  text: string,
  size: number,
  x: number,
  y: number,
  width: number,
  height: number,
  format: TextFormat = DEFAULT_TEXT_FORMAT
): Mesh | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const shapes = generateShapesWithTracking(trimmed, size);
  if (shapes.length === 0) return null;

  const geometry = new ExtrudeGeometry(shapes, {
    depth: EMBOSS_HEIGHT,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return null;

  const textWidth = bounds.max.x - bounds.min.x;
  const textHeight = bounds.max.y - bounds.min.y;
  if (textWidth <= 0 || textHeight <= 0) return null;

  const scale = Math.min(1, width / textWidth, height / textHeight);
  const scaledWidth = textWidth * scale;
  const scaledHeight = textHeight * scale;

  const mesh = new Mesh(geometry, material);
  mesh.scale.set(scale, scale, 1);

  // Align within the box (3×3 grid), honoured in 3D (Y-up) space.
  const hOff = hAlignOffset(format.hAlign, width, scaledWidth);
  const vOff = vAlignOffset(format.vAlign, height, scaledHeight, true);
  const tx = x + hOff - bounds.min.x * scale;
  const ty = y + vOff - bounds.min.y * scale;
  mesh.position.set(tx, ty, topZ - 0.4);
  return mesh;
}

/** Effective font size for a line: auto-fit by default, manual clamped to the box. */
function effectiveFontSize(
  text: string,
  boxW: number,
  boxH: number,
  format?: TextFormat
): number {
  const auto = chooseTextSizeForBox(text, boxW, boxH);
  if (!format || format.autoSize !== false) return auto;
  const manual = format.fontSize || auto;
  return clampManualSize(manual, 1.2, auto); // last value is the "limit" (max that fits)
}

function buildTextMeshes(label: LabelInput): Mesh[] {
  const hasIcon = !!label.iconText || !!label.iconSvg;
  const hasLine1 = !!label.line1.trim();
  const line2Enabled = label.line2Enabled !== false;
  const hasLine2 = line2Enabled && (!!label.line2Svg || !!label.line2.trim());

  // The only present line gets the label's full height. Text boxes are widened
  // by currentExtraWidth so 2×/3× labels get genuinely more text room.
  const topRect = extendRectRight(
    !hasLine2
      ? (hasIcon ? TEXT_SINGLE_BOX : TEXT_SINGLE_BOX_NO_ICON)
      : (hasIcon ? TEXT_TOP_BOX : TEXT_TOP_BOX_NO_ICON),
    currentExtraWidth
  );
  const bottomRect = extendRectRight(
    !hasLine1
      ? (hasIcon ? TEXT_SINGLE_BOX : TEXT_SINGLE_BOX_NO_ICON)
      : (hasIcon ? TEXT_BOTTOM_BOX : TEXT_BOTTOM_BOX_NO_ICON),
    currentExtraWidth
  );

  const topBox = toWorldBox(topRect);
  const bottomBox = toWorldBox(bottomRect);
  const topSize = getBoxSize(topBox);
  const bottomSize = getBoxSize(bottomBox);

  const meshes: Mesh[] = [];

  const format1 = label.line1Format;
  const topFontSize = effectiveFontSize(label.line1, topSize.width, topSize.height, format1);
  const line1Mesh = createTextLineMesh(label.line1, topFontSize, topBox.x1, topBox.y1, topSize.width, topSize.height, format1);
  if (line1Mesh) meshes.push(line1Mesh);

  if (hasLine2) {
    if (label.line2Svg) {
      const line2Mesh = buildSvgMeshInBox(label.line2Svg, bottomRect);
      if (line2Mesh) meshes.push(line2Mesh);
    } else {
      const format2 = label.line2Format;
      const bottomFontSize = effectiveFontSize(label.line2, bottomSize.width, bottomSize.height, format2);
      const line2Mesh = createTextLineMesh(label.line2, bottomFontSize, bottomBox.x1, bottomBox.y1, bottomSize.width, bottomSize.height, format2);
      if (line2Mesh) meshes.push(line2Mesh);
    }
  }

  return meshes;
}

export async function generateLabelStl(label: LabelInput): Promise<ArrayBuffer> {
  await ensureInitialized();


  if (!label.line1.trim() && !label.line2.trim()) {
    throw new Error("At least one text line is required.");
  }

  const width = label.labelWidth ?? 1;
  const extraWidth = (width - 1) * 42;
  // Width-scaled text boxes carry the extra room; content is left-anchored
  // (icon at far left) instead of centred into a fixed-size block.
  currentExtraWidth = extraWidth;
  contentXOffset = 0;

  const baseMesh = cloneBaseMesh();
  if (extraWidth > 0) widenGeometry(baseMesh.geometry, extraWidth);

  const root = new Group();
  root.add(baseMesh);
  if (label.iconText) {
    for (const m of buildIconTextMeshes(label.iconText)) root.add(m);
  }  
  else {
    const iconMesh = buildIconMesh(label.iconSvg);
    if (iconMesh) root.add(iconMesh);
  }
  for (const textMesh of buildTextMeshes(label)) {
    root.add(textMesh);
  }
  root.updateMatrixWorld(true);

  const result = exporter.parse(root, { binary: true });
  if (result instanceof DataView) {
    return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
  }
  // Fallback: ASCII string result
  return new TextEncoder().encode(result as unknown as string).buffer;
}
