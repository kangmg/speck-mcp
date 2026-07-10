# Speck MCP Design System

## 0. Research Log

- Reference renderer: `vangelov/modern-speck`, selected for full-viewport molecular rendering, instanced atom/bond geometry, AO/FXAA-inspired clarity, and export controls.
- Product direction: quiet scientific tool surface with the molecule as the primary object; controls stay compact and secondary.

## 1. Visual Direction

The viewer should read like a figure-preparation tool for computational chemistry papers: neutral background, high-contrast atom colors, subtle depth, crisp unit-cell lines, and export-first controls. The signature moment is rotating a structure, seeing the unit cell remain spatially legible, then saving an image without leaving the page.

## 2. Color Tokens

- `--color-bg`: `#f7f8fb`
- `--color-panel`: `#ffffff`
- `--color-text`: `#15171c`
- `--color-muted`: `#626976`
- `--color-line`: `#d8dde8`
- `--color-accent`: `#2563eb`
- `--color-cell`: `#3b475a`

## 3. Typography

- UI font: system sans-serif stack.
- Mono font: `SFMono-Regular`, `Consolas`, `Liberation Mono`, monospace.
- Label size: 12px.
- Body size: 14px.
- Title size: 16px.

## 4. Spacing

- Base unit: 4px.
- Panel padding: 12px.
- Control gap: 8px.
- Button height: 32px.

## 5. Primitives

- Viewer canvas: full-viewport figure stage with stable dimensions.
- Toolbar panel: fixed top-left controls, translucent white, compact rows.
- Range control: labeled slider plus numeric readout for camera angles and zoom.
- Export buttons: SVG and PNG commands with disabled-free deterministic behavior.

## 6. Motion

Mouse drag rotates the structure. Slider updates are immediate. No decorative motion.

## 7. Accessibility

Controls use real buttons, labels, and inputs. The stage has an accessible figure label. Export buttons are keyboard reachable.

## 8. Accepted Debt

SVG output remains a deterministic fallback for vector workflows. PNG output uses the modern-speck WebGL stage with headless browser capture so publication previews retain the original renderer's atom/cell materials.
