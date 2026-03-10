# Gridfinity Label Generator

**Web generator: https://cnckitchen.github.io/gridfinityLabelGenerator/**

A browser-based tool that generates custom STL labels for [Gridfinity bins](https://www.printables.com/model/592545-gridfinity-bin-with-printable-label-by-pred-parame). Everything runs entirely in the browser — no server or install required for the deployed version.

## What it does

The generator composites a base label STL with embossed text and clipart icons, then exports the result as a ready-to-slice `.stl` file. Labels are designed for a single 1× Gridfinity tile but can be scaled to 2× or 3× width.

Each label consists of:

- **Icon** (left side): one of 10 clipart symbols (hex, nut, nylock, washer, large washer, lock washer, insert, torx, phillips, slot)
- **Line 1** (top right): text, auto-sized to fill the available box
- **Line 2** (bottom right): text, or one of 10 technical screw-profile images (button head, countersunk, cylinder head, grub screw, hex head, low head, pan head, and self-tapping variants)
- **Emboss depth**: 0.4 mm — matches a single layer at 0.4 mm layer height, ideal for colour-change printing

## Modes

### Custom label
Enter your own text and pick an icon. Exports a single `.stl`.

### Predefined labels
Select from a curated catalogue of CNC Kitchen fasteners and inserts. Exporting one label gives an `.stl`; exporting multiple gives a `.zip` with one file per label.

**Categories:**

- **Heat inserts** — metric (M2–M10) and imperial (#2-56–3/8″-16), various lengths
- **Socket head cap screws** — M1.6–M5, lengths from 3–45 mm, each labelled with its Torx drive size (TX5–TX25)
- **Hex nuts** — M2–M8
- **Nylock nuts** — M2–M8
- **Standard washers** — M2–M8
- **Large washers** — M2–M8

## Printing tips

- **Layer height**: 0.2 mm
- **Colour change**: in layer 3 (so the embossed text prints in a contrasting colour)
- **Wall generator**: Arachne recommended for sharper detail on thin strokes

## How it works

STL generation runs entirely in the browser using [Three.js](https://threejs.org/):

1. Loads `GridfinityBinLabel.stl` as the base geometry
2. Parses SVG clipart with `SVGLoader`, extrudes to 3D and scales it into the icon box
3. Generates font glyphs from `helvetiker_bold.typeface.json` using a custom tracking function (tighter letter spacing so the auto-sizer chooses a larger font size, keeping strokes thicker and more slicer-friendly)
4. Extrudes all text and icon shapes to 0.4 mm depth and positions them on the label surface
5. For 2× or 3× wide labels, widens the base geometry and centres the content accordingly
6. Exports the combined mesh as a binary STL via `STLExporter`

## Project structure

```
web/      React + Vite front-end — this is what gets deployed
server/   Express API with equivalent server-side STL generation (not used by the deployed site)
```

## Run locally

```powershell
cd web
npm install
npm run dev
```

Opens at `http://localhost:5173`. No backend needed — all generation happens in-browser.

## Build

```powershell
cd web
npm run build
```

Output goes to `web/dist/`. The `base: "./"` setting in `vite.config.ts` ensures assets use relative paths, so the build works on GitHub Pages and any subdirectory host.
