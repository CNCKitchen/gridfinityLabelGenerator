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
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { LabelInput } from "../types/label";

const EMBOSS_HEIGHT = 0.4;

const SVG_BOX = { x1: 1.5, y1: 0.5, x2: 11, y2: 10 };
const TEXT_TOP_BOX = { x1: 12, y1: 5.75, x2: 33.3, y2: 10 };
const TEXT_BOTTOM_BOX = { x1: 12, y1: 0.5, x2: 33.3, y2: 4.75 };

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

function ensureInitialized(): Promise<void> {
  if (_init) return _init;
  const base = import.meta.env.BASE_URL;
  _init = (async () => {
    const [stlResp, fontResp] = await Promise.all([
      fetch(`${base}GridfinityBinLabel.stl`),
      fetch(`${base}helvetiker_regular.typeface.json`),
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

function toExtrudedMesh(shapes: Shape[], depth: number): Mesh {
  const geometry = new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  });
  return new Mesh(geometry, material);
}

function getTextBounds(text: string, size: number): Box3 | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const shapes = font.generateShapes(trimmed, size);
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
    x1: CONTENT_ORIGIN_X + box.x1,
    y1: CONTENT_ORIGIN_Y + box.y1,
    x2: CONTENT_ORIGIN_X + box.x2,
    y2: CONTENT_ORIGIN_Y + box.y2,
  };
}

function buildIconMesh(iconSvg: string): Mesh {
  const parsed = svgLoader.parse(iconSvg);
  const shapes: Shape[] = [];
  for (const p of parsed.paths) {
    shapes.push(...SVGLoader.createShapes(p));
  }
  if (shapes.length === 0) throw new Error("Invalid icon SVG");

  const extruded = toExtrudedMesh(shapes, EMBOSS_HEIGHT);
  const sourceBounds = getMeshBounds(extruded);
  const sourceWidth = sourceBounds.max.x - sourceBounds.min.x;
  const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error("Invalid icon SVG bounds");

  const target = toWorldBox(SVG_BOX);
  const targetSize = getBoxSize(target);
  const scale = Math.min(targetSize.width / sourceWidth, targetSize.height / sourceHeight);

  extruded.scale.set(scale, scale, 1);

  const scaledBounds = getMeshBounds(extruded);
  const scaledWidth = scaledBounds.max.x - scaledBounds.min.x;
  const scaledHeight = scaledBounds.max.y - scaledBounds.min.y;
  const tx = target.x1 + (targetSize.width - scaledWidth) / 2 - scaledBounds.min.x;
  const ty = target.y1 + (targetSize.height - scaledHeight) / 2 - scaledBounds.min.y;

  extruded.position.set(tx, ty, topZ);
  return extruded;
}

function chooseTextSizeForBox(text: string, maxWidth: number, maxHeight: number): number {
  let size = 6;
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
  height: number
): Mesh | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const shapes = font.generateShapes(trimmed, size);
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

  const tx = x + (width - scaledWidth) / 2 - bounds.min.x * scale;
  const ty = y + (height - scaledHeight) / 2 - bounds.min.y * scale;
  mesh.position.set(tx, ty, topZ);
  return mesh;
}

function buildTextMeshes(label: LabelInput): Mesh[] {
  const topBox = toWorldBox(TEXT_TOP_BOX);
  const bottomBox = toWorldBox(TEXT_BOTTOM_BOX);
  const topSize = getBoxSize(topBox);
  const bottomSize = getBoxSize(bottomBox);

  const topFontSize = chooseTextSizeForBox(label.line1, topSize.width, topSize.height);
  const bottomFontSize = chooseTextSizeForBox(label.line2, bottomSize.width, bottomSize.height);

  const meshes: Mesh[] = [];
  const line1Mesh = createTextLineMesh(label.line1, topFontSize, topBox.x1, topBox.y1, topSize.width, topSize.height);
  const line2Mesh = createTextLineMesh(label.line2, bottomFontSize, bottomBox.x1, bottomBox.y1, bottomSize.width, bottomSize.height);

  if (line1Mesh) meshes.push(line1Mesh);
  if (line2Mesh) meshes.push(line2Mesh);
  return meshes;
}

export async function generateLabelStl(label: LabelInput): Promise<ArrayBuffer> {
  await ensureInitialized();

  if (!label.line1.trim() && !label.line2.trim()) {
    throw new Error("At least one text line is required.");
  }

  const root = new Group();
  root.add(cloneBaseMesh());
  root.add(buildIconMesh(label.iconSvg));
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
