import type { CameraView, Mat3, StructureModel, Vec3 } from "./types.js"

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v)
  if (length < 1e-12) throw new Error("Cannot orient a degenerate unit cell")
  return [v[0] / length, v[1] / length, v[2] / length]
}

/** Right-handed orthonormal camera basis; never orthogonalize the structure. */
export function cellViewBasis(cell: Mat3 | null, view: CameraView): Mat3 {
  if (!cell || view === "free")
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
  const [a, b, c] = cell
  // View from +c, +a, or -b; the latter keeps +c upwards in orthogonal cells.
  const depth: Vec3 = view === "top" ? c : view === "side-a" ? a : [-b[0], -b[1], -b[2]]
  const horizontal = view === "side-a" ? b : a
  const z = unit(depth)
  const y = unit(cross(z, horizontal))
  const x = unit(cross(y, z))
  return [x, y, z]
}

export function projectBasis(point: Vec3, basis: Mat3): Vec3 {
  return [dot(point, basis[0]), dot(point, basis[1]), dot(point, basis[2])]
}

export function orientStructure(structure: StructureModel, view: CameraView): StructureModel {
  const basis = cellViewBasis(structure.cell, view)
  return {
    ...structure,
    atoms: structure.atoms.map((atom) => ({
      ...atom,
      position: projectBasis(atom.position, basis),
    })),
    cell: structure.cell
      ? [
          projectBasis(structure.cell[0], basis),
          projectBasis(structure.cell[1], basis),
          projectBasis(structure.cell[2], basis),
        ]
      : null,
  }
}
