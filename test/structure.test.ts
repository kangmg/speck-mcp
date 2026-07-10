import assert from "node:assert/strict"
import test from "node:test"
import { figureOptionsSchema } from "../src/schemas.js"
import { parseStructure } from "../src/structure.js"
import { mergeFigureOptions, renderSvg } from "../src/svg-renderer.js"

const waterExtxyz = `3
Lattice="6.0 0.0 0.0 0.0 6.0 0.0 0.0 0.0 6.0" Properties=species:S:1:pos:R:3 pbc="T T T"
O 3.000000 3.000000 3.000000
H 3.958400 3.000000 3.000000
H 2.760000 3.927000 3.000000
`

const siliconPoscar = `Si
1.0
5.43 0.00 0.00
0.00 5.43 0.00
0.00 0.00 5.43
Si
2
Direct
0.000000 0.000000 0.000000
0.250000 0.250000 0.250000
`

test("Given extxyz with lattice When parsed Then atoms, bonds, and cell are available", () => {
  const structure = parseStructure({
    source: waterExtxyz,
    sourceKind: "text",
    format: "extxyz",
    name: "water",
  })

  assert.equal(structure.formula, "H2O")
  assert.equal(structure.atoms.length, 3)
  assert.equal(structure.bonds.length, 2)
  assert.notEqual(structure.cell, null)
  assert.deepEqual(structure.pbc, [true, true, true])
})

test("Given POSCAR text When parsed through ase-ts Then direct coordinates and cell are preserved", () => {
  const structure = parseStructure({
    source: siliconPoscar,
    sourceKind: "text",
    format: "vasp",
    name: "silicon",
  })

  assert.equal(structure.formula, "Si2")
  assert.equal(structure.atoms.length, 2)
  assert.notEqual(structure.cell, null)
  assert.deepEqual(structure.pbc, [true, true, true])
})

test("Given parsed structure When rendered as SVG Then figure contains atoms and unit cell lines", () => {
  const structure = parseStructure({
    source: waterExtxyz,
    sourceKind: "text",
    format: "extxyz",
    name: "water",
  })
  const svg = renderSvg(
    structure,
    mergeFigureOptions({ width: 640, height: 480, showCell: true, showBonds: true }),
  )

  assert.match(svg, /<svg/)
  assert.match(svg, /aria-label="H2O molecular structure"/)
  assert.match(svg, /stroke-dasharray="5 4"/)
  assert.match(svg, />O<\/text>/)
})

test("Given no figure options When parsed Then the default view is cell-aligned and high resolution", () => {
  const options = figureOptionsSchema.parse({})

  assert.equal(options.view, "top")
  assert.equal(options.renderScale, 2)
  assert.equal(options.background, "#ffffff")
})
