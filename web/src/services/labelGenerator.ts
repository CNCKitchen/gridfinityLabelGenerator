import {
  Box3,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshNormalMaterial,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
} from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { ImageAsset, LabelInput, TextFormat } from "../types/label";
import {
  clampManualSize,
  DEFAULT_TEXT_FORMAT,
  extendRectRight,
  hAlignOffset,
  vAlignOffset,
} from "./geometry";
import { BUILTIN_IMAGES } from "./imageRegistry";
import {
  ensureTextFont,
  generateShapesWithTracking,
  layoutComposed,
  maxFittingSizeComposed,
  parseLineTemplate,
  type LineToken,
} from "./textMetrics";

const EMBOSS_HEIGHT = 0.4;

// The large symbol/icon row on the far left. Its width is dynamic (from the
// symbol template); the text lines shift right by it. 1.5 is the local x origin
// (== CONTENT_ORIGIN_X offset); right edge of all text boxes is 34.5.
const ICON_AREA_HEIGHT = 9.5;
const ICON_AREA_X = 1.5;
const TEXT_RIGHT_EDGE = 34.5;
const LEGACY_ICON_WIDTH = 9.5;

const SVG_BOX = { x1: 1.5, y1: 0.5, x2: 11, y2: 10 };

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
    const [stlResp] = await Promise.all([
      fetch(`${base}GridfinityBinLabel.stl`),
      ensureTextFont(),
    ]);
    if (!stlResp.ok) {
      throw new Error("Failed to load label assets");
    }
    baseGeometry = stlLoader.parse(await stlResp.arrayBuffer());
    baseGeometry.computeBoundingBox();
    const bounds = baseGeometry.boundingBox ?? new Box3();
    topZ = bounds.max.z;
    CONTENT_ORIGIN_X = bounds.min.x + 1.5;
    CONTENT_ORIGIN_Y = bounds.min.y + 0.5;
  })();
  return _init;
}

function cloneBaseMesh(): Mesh<BufferGeometry> {
  return new Mesh(baseGeometry.clone(), material);
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

/**
 * Builds an SVG mesh scaled so its drawing fits (preserveAspectRatio="meet")
 * inside a box of `boxW`×`boxH`, centred with the box's lower-left corner at
 * `(ox, oy)` and `z` at `oz`. The returned mesh is already positioned.
 */
function buildScaledSvgMesh(
  svgString: string,
  boxW: number,
  boxH: number,
  ox: number,
  oy: number,
  oz: number
): Mesh | null {
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

  const scale = Math.min(boxW / sourceWidth, boxH / sourceHeight);

  // SVG assets use screen coordinates where Y grows downward. Rotate the
  // geometry around X instead of using a negative scale so triangle winding
  // stays outward-facing in the exported STL.
  extruded.geometry.rotateX(Math.PI);
  extruded.geometry.scale(scale, scale, 1);
  extruded.geometry.computeVertexNormals();

  const scaledBounds = getMeshBounds(extruded);
  const scaledWidth = scaledBounds.max.x - scaledBounds.min.x;
  const scaledHeight = scaledBounds.max.y - scaledBounds.min.y;
  const tx = ox + (boxW - scaledWidth) / 2 - scaledBounds.min.x;
  const ty = oy + (boxH - scaledHeight) / 2 - scaledBounds.min.y;

  extruded.position.set(tx, ty, oz);
  return extruded;
}

function buildSvgMeshInBox(svgString: string, box: Rect): Mesh | null {
  const target = toWorldBox(box);
  const targetSize = getBoxSize(target);
  return buildScaledSvgMesh(svgString, targetSize.width, targetSize.height, target.x1, target.y1, topZ);
}

/**
 * Builds an inline SVG mesh fitted into a local box of `boxW`×`boxH` whose
 * lower-left corner is the origin (0,0). Used for images embedded in a text
 * line; the caller places the box with extra translations.
 */
function buildSvgMeshInLocalBox(svgString: string, boxW: number, boxH: number): Mesh | null {
  return buildScaledSvgMesh(svgString, boxW, boxH, 0, 0, 0);
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

/**
 * Effective font size for a (possibly image-bearing) line: auto-fit by default,
 * manual clamped to the same composed fit maximum. The registry resolves any
 * `${Name}` references so images count against the box width.
 */
async function effectiveComposedSize(
  tokens: LineToken[],
  boxW: number,
  boxH: number,
  format: TextFormat | undefined,
  registry: ImageAsset[]
): Promise<number> {
  const auto = await maxFittingSizeComposed(tokens, boxW, boxH, registry);
  if (!format || format.autoSize !== false) return auto;
  return clampManualSize(format.fontSize ?? auto, 1.2, auto);
}

/**
 * Width (mm) of the large symbol/icon row on the left, which shifts the text
 * lines right. Computed from the symbol template at the large icon size; falls
 * back to the fixed legacy width when the label uses `iconSvg`/`iconText`.
 */
function computeIconRowWidth(label: LabelInput, registry: ImageAsset[]): number {
  if (label.symbol && label.symbol.trim()) {
    const tokens = parseLineTemplate(label.symbol);
    if (tokens.length === 0) return 0;
    return layoutComposed(tokens, ICON_AREA_HEIGHT, registry).totalWidth;
  }
  if (label.iconSvg || label.iconText) return LEGACY_ICON_WIDTH;
  return 0;
}

/**
 * Builds the meshes for one composed line (text runs + inline images) and
 * places them in `box` honouring the 3×3 alignment grid. Tokens are centred on
 * the content's vertical centre so icons read aligned with the text. The layout
 * comes from the shared textMetrics module so the STL and preview match exactly.
 * Returns null when there is nothing to draw.
 */
function buildComposedLineGroup(
  tokens: LineToken[],
  size: number,
  box: Rect,
  format: TextFormat | undefined,
  registry: ImageAsset[]
): Group | null {
  const layout = layoutComposed(tokens, size, registry);
  if (layout.tokens.length === 0) return null;

  const fmt = format ?? DEFAULT_TEXT_FORMAT;
  const boxW = box.x2 - box.x1;
  const boxH = box.y2 - box.y1;
  const hOff = hAlignOffset(fmt.hAlign, boxW, layout.totalWidth);
  const vOff = vAlignOffset(fmt.vAlign, boxH, layout.contentHeight, true);

  const group = new Group();
  group.position.set(box.x1 + hOff, box.y1 + vOff, 0);

  const z = topZ - 0.4; // content sits on the label surface (top at topZ)
  const centerY = layout.contentHeight / 2;
  let cursor = 0;
  for (const t of layout.tokens) {
    if (t.type === "text" && t.text && t.ink) {
      const shapes = generateShapesWithTracking(t.text.trim(), size);
      if (shapes.length > 0) {
        const geometry = new ExtrudeGeometry(shapes, { depth: EMBOSS_HEIGHT, bevelEnabled: false, curveSegments: 10 });
        geometry.computeBoundingBox();
        const b = geometry.boundingBox;
        if (b) {
          const mesh = new Mesh(geometry, material);
          const inkCenterY = b.min.y + (b.max.y - b.min.y) / 2;
          // Ink left edge at cursor+prePad; ink centre centred on the line.
          mesh.position.set((cursor + t.prePad) - b.min.x, centerY - inkCenterY, z);
          group.add(mesh);
        }
      }
    } else if (t.type === "image" && t.asset) {
      const mesh = buildSvgMeshInLocalBox(t.asset.svg, t.width, t.height);
      if (mesh) {
        // Centre the image box on the line; the fit-in-box keeps its aspect.
        mesh.position.x += cursor;
        mesh.position.y += centerY - t.height / 2;
        mesh.position.z = z;
        group.add(mesh);
      }
    }
    cursor += t.width; // spaces (incl. prePad/postPad) are already in t.width
  }
  return group.children.length > 0 ? group : null;
}

/** Builds the meshes for the large symbol/icon row on the far left (or legacy). */
function buildIconRowMeshes(label: LabelInput, registry: ImageAsset[]): (Mesh | Group)[] {
  if (label.symbol && label.symbol.trim()) {
    const tokens = parseLineTemplate(label.symbol);
    const width = layoutComposed(tokens, ICON_AREA_HEIGHT, registry).totalWidth;
    if (width <= 0) return [];
    const box: Rect = {
      x1: CONTENT_ORIGIN_X + ICON_AREA_X,
      y1: CONTENT_ORIGIN_Y + 0.5,
      x2: CONTENT_ORIGIN_X + ICON_AREA_X + width,
      y2: CONTENT_ORIGIN_Y + 0.5 + ICON_AREA_HEIGHT,
    };
    const g = buildComposedLineGroup(tokens, ICON_AREA_HEIGHT, box, { autoSize: true, hAlign: "left", vAlign: "center" }, registry);
    return g ? [g] : [];
  }
  if (label.iconText) {
    return buildIconTextMeshes(label.iconText);
  }
  const iconMesh = buildIconMesh(label.iconSvg);
  return iconMesh ? [iconMesh] : [];
}

async function buildTextMeshes(label: LabelInput, registry: ImageAsset[]): Promise<(Mesh | Group)[]> {
  const iconW = computeIconRowWidth(label, registry);
  const hasLine1 = !!label.line1.trim();
  const line2Enabled = label.line2Enabled !== false;
  const hasLine2 = line2Enabled && (!!label.line2Svg || !!label.line2.trim());

  const left = ICON_AREA_X + iconW;
  const right = TEXT_RIGHT_EDGE;

  // The only present line gets the label's full height. Boxes are widened by
  // currentExtraWidth so 2×/3× labels get genuinely more text room.
  const topRect = extendRectRight(
    !hasLine2 ? { x1: left, y1: 0.5, x2: right, y2: 10 } : { x1: left, y1: 5.75, x2: right, y2: 10 },
    currentExtraWidth
  );
  const bottomRect = extendRectRight(
    !hasLine1 ? { x1: left, y1: 0.5, x2: right, y2: 10 } : { x1: left, y1: 0.5, x2: right, y2: 4.75 },
    currentExtraWidth
  );

  const topBox = toWorldBox(topRect);
  const bottomBox = toWorldBox(bottomRect);
  const topSize = getBoxSize(topBox);
  const bottomSize = getBoxSize(bottomBox);

  const meshes: (Mesh | Group)[] = [];

  const tokens1 = parseLineTemplate(label.line1);
  if (tokens1.length > 0) {
    const size1 = await effectiveComposedSize(tokens1, topSize.width, topSize.height, label.line1Format, registry);
    const g = buildComposedLineGroup(tokens1, size1, topBox, label.line1Format, registry);
    if (g) meshes.push(g);
  }

  if (hasLine2) {
    if (label.line2Svg) {
      const line2Mesh = buildSvgMeshInBox(label.line2Svg, bottomRect);
      if (line2Mesh) meshes.push(line2Mesh);
    } else {
      const tokens2 = parseLineTemplate(label.line2);
      if (tokens2.length > 0) {
        const size2 = await effectiveComposedSize(tokens2, bottomSize.width, bottomSize.height, label.line2Format, registry);
        const g = buildComposedLineGroup(tokens2, size2, bottomBox, label.line2Format, registry);
        if (g) meshes.push(g);
      }
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

  const registry = label.icons ?? BUILTIN_IMAGES;

  const root = new Group();
  root.add(baseMesh);
  for (const m of buildIconRowMeshes(label, registry)) root.add(m);
  for (const textMesh of await buildTextMeshes(label, registry)) {
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
