---
name: speck-publisher
description: Use this skill to create publication-quality molecular or atomistic structure images from XYZ, extxyz, POSCAR/CONTCAR, CIF, PDB, vasprun.xml, ORCA output, or ASE trajectory files via the local speck-mcp MCP renderer. Use when an agent needs unit-cell-aware camera control, angle tuning, SVG/PNG export, or paper-ready chemistry figures.
---

# Speck Publisher

Use the `speck-mcp` MCP server to turn atomistic structures into paper-ready figures. The renderer is based on the Speck/modern-speck workflow: structure parsing, atom/bond model construction, camera adjustment, unit-cell display, and deterministic image export.

## Required MCP Tools

Expected tools:

- `speck_structure_summary`: parse a structure and report formula, atom count, inferred bonds, PBC, and cell status.
- `speck_viewer_html`: create a standalone interactive HTML viewer with mouse rotation, theta/phi/zoom sliders, cell/bond toggles, and SVG/PNG download buttons.
- `speck_render_image`: render deterministic SVG or PNG output with cell-basis view presets, camera, cell, bond, transparency, and sizing options.

If the tools are not connected, build and run the local MCP server from this repository:

```bash
npm install
npm run build
node dist/src/server.js
```

Configure the MCP client to launch that command over stdio.

## Workflow

1. Parse first with `speck_structure_summary`.
   Confirm the inferred format, formula, atom count, and whether a unit cell is present before rendering.
2. Choose a cell-basis view before tuning camera angles.
   Use `view: "top"` to view from +c with projected a horizontal, `view: "side-a"` to view from +a with projected b horizontal, and `view: "side-b"` to view from -b with projected a horizontal. These are rigid, right-handed rotations: oblique cell angles remain oblique. A cell-axis view is not generally perpendicular to the opposite cell face. Use `view: "free"` only when an oblique Cartesian camera is explicitly requested.
3. Use `speck_viewer_html` when the final composition needs human or agent tuning.
   Open the generated HTML, adjust theta/phi/zoom, cell, bonds, and transparency, then reuse those values for final export. Dragging uses the same theta/phi orbit convention as the sliders (phi is limited to +/-90 degrees). Copy URL preserves the complete view, including pan and zoom; theta/phi alone only reproduce orientation.
4. Use `speck_render_image` for final assets.
   Prefer SVG for journal/vector workflows and PNG for direct manuscript insertion or previews.

## Rendering Defaults

Use these defaults unless the user specifies otherwise:

- `formatOut`: `svg` for final manuscript figures, `png` for previews.
- `width`: `1800`
- `height`: `1400`
- `view`: `"top"` for the default publication orientation.
- `renderScale`: `2` or higher for PNG; output pixel dimensions are multiplied by this value.
- `showCell`: `true` when a cell exists.
- `showBonds`: `true` for molecules and framework structures; `false` for dense metallic systems if bonds clutter the figure.
- `transparent`: PNG exports remove the page background for figure-panel composition; standalone HTML uses a white background.
- `camera`: default to `{ "theta": 0, "phi": 0, "zoom": 1 }` with `view: "top"` for a cell-axis view; projected edges need not overlap for non-orthogonal cells. Only change theta/phi when the user asks for an angled view or `view: "free"`.

## Format Guidance

- For POSCAR/CONTCAR, pass `format: "vasp"` when the filename does not make the format obvious.
- For extxyz, pass `format: "extxyz"` to preserve lattice and PBC metadata.
- For CIF/PDB, pass explicit `format` if parsing fails by extension.
- For text pasted into chat, use `sourceKind: "text"` and pass the format explicitly.

## Quality Bar

Final output must include the exact file path, format, dimensions, camera values, and whether cell/bonds/transparency were enabled. If rendering fails, report the parser error and ask for the original structure text or file path instead of guessing atom positions.
