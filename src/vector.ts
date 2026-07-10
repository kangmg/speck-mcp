import type { Mat3, Vec3 } from "./types.js"

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor]
}

export function distance(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.hypot(dx, dy, dz)
}

export function centerOf(points: readonly Vec3[]): Vec3 {
  if (points.length === 0) {
    return [0, 0, 0]
  }
  const total = points.reduce<Vec3>((sum, point) => add(sum, point), [0, 0, 0])
  return scale(total, 1 / points.length)
}

export function isRealCell(cell: Mat3): boolean {
  return cell.some((row) => row.some((value) => Math.abs(value) > 1e-9))
}
