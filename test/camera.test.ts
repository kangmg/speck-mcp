import assert from "node:assert/strict"
import test from "node:test"
import { mat4, vec3 } from "gl-matrix"
import { cameraRotation, dragCamera, restoreCamera } from "../src/camera.js"
import { cellViewBasis, orientStructure, projectBasis } from "../src/cell-view.js"
import { mergeFigureOptions, renderSvg } from "../src/svg-renderer.js"
import type { CameraView, Mat3, StructureModel, Vec3 } from "../src/types.js"

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cell: Mat3 = [
  [3, 1, 0],
  [-1, 4, 1],
  [0.5, 0.8, 6],
]

test("cell views preserve distances, cell angles and handedness for skewed cells", () => {
  for (const view of ["top", "side-a", "side-b", "free"] as CameraView[]) {
    const basis = cellViewBasis(cell, view)
    const transformed = cell.map((v) => projectBasis(v, basis))
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        close(
          dot(transformed[i] as Vec3, transformed[j] as Vec3),
          dot(cell[i] as Vec3, cell[j] as Vec3),
        )
        close(dot(basis[i] as Vec3, basis[j] as Vec3), i === j ? 1 : 0)
      }
    const cross = vec3.cross(vec3.create(), [...basis[0]], [...basis[1]])
    close(vec3.dot(cross, [...basis[2]]), 1)
    const p: Vec3 = [0.3, 2.1, -1.4]
    close(Math.hypot(...projectBasis(p, basis)), Math.hypot(...p))
  }
})

test("cell axis is normal to screen and chosen horizontal vector stays horizontal", () => {
  for (const [view, depth, horizontal] of [
    ["top", cell[2], cell[0]],
    ["side-a", cell[0], cell[1]],
    ["side-b", cell[1], cell[0]],
  ] as const) {
    const basis = cellViewBasis(cell, view)
    const d = projectBasis(depth, basis)
    close(d[0], 0)
    close(d[1], 0)
    close(projectBasis(horizontal, basis)[1], 0)
  }
})

test("SVG cell presets use the same rigid transform as WebGL", () => {
  const structure: StructureModel = {
    name: "skew",
    formula: "Cu",
    pbc: [true, true, true],
    cell,
    atoms: [{ index: 0, symbol: "Cu", position: [1, 2, 3], radius: 1, color: "#aa6633" }],
    bonds: [],
  }
  for (const view of ["top", "side-a", "side-b"] as const) {
    const options = mergeFigureOptions({ view, camera: { theta: 28, phi: -17 } })
    assert.equal(
      renderSvg(structure, options),
      renderSvg(orientStructure(structure, view), { ...options, view: "free" }),
    )
  }
})

test("successive drags are reproducible from displayed theta and phi", () => {
  let angles = { theta: 0, phi: 0 }
  for (const [dx, dy] of [
    [23, 14],
    [-51, 29],
    [4000, -500],
  ] as const) {
    angles = dragCamera(angles.theta, angles.phi, dx, dy)
    assert.ok(angles.theta >= -180 && angles.theta < 180)
    assert.ok(angles.phi >= -90 && angles.phi <= 90)
    const restored = restoreCamera({ cameraTheta: angles.theta, cameraPhi: angles.phi })
    assert.deepEqual(restored, cameraRotation(angles.theta, angles.phi))
  }
})

test("shared matrices survive JSON and take precedence over stale angle values", () => {
  const rotation = cameraRotation(35, 24)
  mat4.rotateZ(rotation, rotation, 0.43)
  const saved = JSON.parse(JSON.stringify({ rotation, cameraTheta: 0, cameraPhi: 0 }))
  assert.deepEqual(restoreCamera(saved), rotation)
})
