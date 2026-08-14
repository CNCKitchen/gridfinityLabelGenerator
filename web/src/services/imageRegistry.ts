import type { ImageAsset } from "../types/label";
import hexSvg from "../assets/hex.svg?raw";
import insertSvg from "../assets/insert.svg?raw";
import lockwasherSvg from "../assets/lockwasher.svg?raw";
import nutSvg from "../assets/nut.svg?raw";
import squareNutSvg from "../assets/square_nut.svg?raw";
import nylockSvg from "../assets/nylock.svg?raw";
import phillipsSvg from "../assets/phillips.svg?raw";
import slotSvg from "../assets/slot.svg?raw";
import torxSvg from "../assets/torx.svg?raw";
import washerSvg from "../assets/washer.svg?raw";
import washerLargeSvg from "../assets/washer_large.svg?raw";
import tNutSvg from "../assets/tnut.svg?raw";
import rollInTNutSvg from "../assets/roll-in-tnut.svg?raw";
import robertsonSvg from "../assets/robertson.svg?raw";
import wingnutSvg from "../assets/wingnut.svg?raw";

import trpButtonHeadSvg from "../assets/TRP_ButtonHead.svg?raw";
import trpCountersunkSvg from "../assets/TRP_countersunkHead.svg?raw";
import trpCskSelfTapSvg from "../assets/TRP_countersunk_selfTapping.svg?raw";
import trpCylinderSvg from "../assets/TRP_cylinderHeadScrew.svg?raw";
import trpCylSelfTapSvg from "../assets/TRP_cylinderHead_selfTapping.svg?raw";
import trpGrubSvg from "../assets/TRP_grubscrew.svg?raw";
import trpHexagonSvg from "../assets/TRP_hexagonHead.svg?raw";
import trpLowHeadSvg from "../assets/TRP_lowHeadScrew.svg?raw";
import trpPanHeadSvg from "../assets/TRP_PanHead.svg?raw";
import trpPanSelfTapSvg from "../assets/TRP_panHead_selfTapping.svg?raw";

/** Small geometric "Symbol" icons shown in the box to the left of the text. */
export const CLIPART_IMAGES: ImageAsset[] = [
  { id: "hex",          name: "Hex",         svg: hexSvg,         viewBox: "299 276 111 111" },
  { id: "insert",       name: "Insert",      svg: insertSvg,      viewBox: "537 346 75 98"  },
  { id: "lockwasher",   name: "Lock Washer", svg: lockwasherSvg,  viewBox: "38 564 111 111" },
  { id: "nut",          name: "Nut",         svg: nutSvg,         viewBox: "307 549 137 120" },
  { id: "square_nut",   name: "Square nut",  svg: squareNutSvg,   viewBox: "-11 -11 130 130" },
  { id: "nylock",       name: "Nylock",      svg: nylockSvg,      viewBox: "477 549 137 120" },
  { id: "wingnut",      name: "Wingnut",     svg: wingnutSvg,     viewBox: "16 16 168 102" },
  { id: "phillips",     name: "Phillips",    svg: phillipsSvg,    viewBox: "81 51 112 112" },
  { id: "robertson",    name: "Robertson",   svg: robertsonSvg,   viewBox: "47 47 120 120" },
  { id: "slot",         name: "Slot",        svg: slotSvg,        viewBox: "35 125 125 113" },
  { id: "torx",         name: "Torx",        svg: torxSvg,        viewBox: "541 127 112 112" },
  { id: "washer",       name: "Washer",      svg: washerSvg,      viewBox: "38 280 112 112" },
  { id: "washer_large", name: "Washer L",    svg: washerLargeSvg, viewBox: "48 421 112 112" },
  { id: "t_nut",        name: "T-Nut",       svg: tNutSvg,        viewBox: "15 -35 80 120" },
  { id: "roll-in_t_nut",name: "Roll Nut",    svg: rollInTNutSvg,  viewBox: "-10 -10 100 170" },
];

/** Screw-profile images ("Button Head", ...) embeddable in a line via `${Name}`. */
export const SCREW_IMAGES: ImageAsset[] = [
  { id: "btn",    name: "Button Head",   svg: trpButtonHeadSvg,  viewBox: "25 1070 93 29"  },
  { id: "csk",    name: "Countersunk",   svg: trpCountersunkSvg, viewBox: "82 924 91 37"  },
  { id: "csk-st", name: "Csk Self-Tap",  svg: trpCskSelfTapSvg,  viewBox: "136 255 98 38"  },
  { id: "cyl",    name: "Cylinder Head", svg: trpCylinderSvg,    viewBox: "19 1080 96 31"  },
  { id: "cyl-st", name: "Cyl Self-Tap",  svg: trpCylSelfTapSvg,  viewBox: "133 400 103 35" },
  { id: "grub",   name: "Grub Screw",    svg: trpGrubSvg,        viewBox: "84 265 44 22"  },
  { id: "hex",    name: "Hex Head",      svg: trpHexagonSvg,     viewBox: "12 1000 93 33"  },
  { id: "low",    name: "Low Head",      svg: trpLowHeadSvg,     viewBox: "28 1042 93 32"  },
  { id: "pan",    name: "Pan Head",      svg: trpPanHeadSvg,     viewBox: "72 977 107 31"  },
  { id: "pan-st", name: "Pan Self-Tap",  svg: trpPanSelfTapSvg,  viewBox: "134 329 97 33" },
];

/**
 * The default image registry, used whenever a label doesn't carry its own
 * `icons` list. The custom form passes all built-ins + the user's imported
 * icons; the renderers fall back to these built-ins otherwise.
 */
export const BUILTIN_IMAGES: ImageAsset[] = [...CLIPART_IMAGES, ...SCREW_IMAGES];

/** Aspect ratio (width/height) of an image from its tight content viewBox. */
export function assetAspect(asset: ImageAsset): number {
  const vb = asset.viewBox;
  if (vb) {
    const [,, w, h] = vb.split(/[\s,]+/).map(Number);
    if (w > 0 && h > 0) return w / h;
  }
  return 1; // square fallback
}

/** Resolves an image by its `${Name}` reference within a registry (first match wins). */
export function resolveImage(name: string, registry: ImageAsset[]): ImageAsset | undefined {
  const key = name.trim();
  return registry.find((a) => a.name === key);
}