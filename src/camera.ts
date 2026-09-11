import { mat4 } from "gl-matrix"

/** Same Y-then-X matrix convention in the viewer and SVG exporter. */
export function cameraRotation(theta: number, phi: number): mat4 {
  const rotation = mat4.create()
  mat4.rotateY(rotation, rotation, (theta * Math.PI) / 180)
  mat4.rotateX(rotation, rotation, (phi * Math.PI) / 180)
  return rotation
}

export function dragCamera(theta: number, phi: number, dx: number, dy: number) {
  const degreesPerPixel = (0.005 * 180) / Math.PI
  return {
    theta: ((((theta + dx * degreesPerPixel + 180) % 360) + 360) % 360) - 180,
    phi: Math.max(-90, Math.min(90, phi + dy * degreesPerPixel)),
  }
}

/** Explicit matrices in saved views take precedence over legacy angle fields. */
export function restoreCamera(saved: {
  rotation?: mat4
  cameraTheta?: number
  cameraPhi?: number
}) {
  return saved.rotation
    ? mat4.clone(saved.rotation)
    : cameraRotation(saved.cameraTheta ?? 0, saved.cameraPhi ?? 0)
}
