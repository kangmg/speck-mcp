import { vec3 } from "gl-matrix"
import { cameraRotation } from "./camera.js"
import { orientStructure } from "./cell-view.js"
import type {
  AtomModel,
  Camera,
  FigureOptionPatch,
  FigureOptions,
  StructureModel,
  Vec3,
} from "./types.js"
import { add, centerOf, distance, sub } from "./vector.js"

type ProjectedPoint = {
  readonly x: number
  readonly y: number
  readonly depth: number
}

type ProjectedAtom = ProjectedPoint & {
  readonly atom: AtomModel
  readonly screenRadius: number
}

type SvgPrimitive = {
  readonly depth: number
  readonly markup: string
}

const defaultOptions: FigureOptions = {
  width: 1200,
  height: 900,
  camera: { theta: 0, phi: 0, zoom: 1 },
  view: "top",
  renderScale: 2,
  showCell: true,
  showBonds: true,
  transparent: false,
  background: "#ffffff",
  atomScale: 1,
  bondScale: 1,
}

export function mergeFigureOptions(options: FigureOptionPatch): FigureOptions {
  return {
    width: options.width ?? defaultOptions.width,
    height: options.height ?? defaultOptions.height,
    view: options.view ?? defaultOptions.view,
    renderScale: options.renderScale ?? defaultOptions.renderScale,
    showCell: options.showCell ?? defaultOptions.showCell,
    showBonds: options.showBonds ?? defaultOptions.showBonds,
    transparent: options.transparent ?? defaultOptions.transparent,
    background: options.background ?? defaultOptions.background,
    atomScale: options.atomScale ?? defaultOptions.atomScale,
    bondScale: options.bondScale ?? defaultOptions.bondScale,
    title: options.title,
    camera: { ...defaultOptions.camera, ...options.camera },
  }
}

export function renderSvg(input: StructureModel, options: FigureOptions): string {
  const structure = orientStructure(input, options.view)
  const center = centerOf(structure.atoms.map((atom) => atom.position))
  const cellCorners = options.showCell && structure.cell ? makeCellCorners(structure.cell) : []
  const scenePoints = [...structure.atoms.map((atom) => atom.position), ...cellCorners]
  const sceneRadius = Math.max(1, ...scenePoints.map((point) => distance(point, center)))
  const fit = (Math.min(options.width, options.height) * 0.42 * options.camera.zoom) / sceneRadius
  const project = (point: Vec3): ProjectedPoint =>
    projectPoint(sub(point, center), options.camera, fit, options)
  const atoms = structure.atoms.map((atom) => {
    const point = project(atom.position)
    return {
      atom,
      x: point.x,
      y: point.y,
      depth: point.depth,
      screenRadius: Math.max(2.5, atom.radius * fit * 0.36 * options.atomScale),
    }
  })
  const atomIndex = new Map(atoms.map((atom) => [atom.atom.index, atom]))
  const primitives = [
    ...cellPrimitives(structure, project, options),
    ...bondPrimitives(structure, atomIndex, options),
    ...atomPrimitives(atoms),
  ].sort((left, right) => left.depth - right.depth)

  const background = options.transparent
    ? ""
    : `<rect width="100%" height="100%" fill="${escapeAttr(options.background)}"/>`
  const title = options.title ? `<title>${escapeText(options.title)}</title>` : ""

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="${escapeAttr(structure.formula)} molecular structure">`,
    title,
    "<defs>",
    ...atomGradients(structure.atoms),
    "</defs>",
    background,
    `<g font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">`,
    ...primitives.map((primitive) => primitive.markup),
    "</g>",
    "</svg>",
  ].join("")
}

function projectPoint(
  point: Vec3,
  camera: Camera,
  fit: number,
  options: FigureOptions,
): ProjectedPoint {
  const rotated = vec3.transformMat4(
    vec3.create(),
    [...point],
    cameraRotation(camera.theta, camera.phi),
  )
  const [yawX, pitchY, depth] = Array.from(rotated) as [number, number, number]
  return {
    x: options.width / 2 + yawX * fit,
    y: options.height / 2 - pitchY * fit,
    depth,
  }
}

function atomGradients(atoms: readonly AtomModel[]): readonly string[] {
  return atoms.map((atom) => {
    const id = atomGradientId(atom)
    return [
      `<radialGradient id="${id}" cx="34%" cy="28%" r="68%">`,
      `<stop offset="0%" stop-color="${shade(atom.color, 0.58)}"/>`,
      `<stop offset="48%" stop-color="${escapeAttr(atom.color)}"/>`,
      `<stop offset="100%" stop-color="${shade(atom.color, -0.34)}"/>`,
      "</radialGradient>",
    ].join("")
  })
}

function atomPrimitives(atoms: readonly ProjectedAtom[]): readonly SvgPrimitive[] {
  return atoms.map((atom) => ({
    depth: atom.depth,
    markup: [
      `<circle cx="${fmt(atom.x)}" cy="${fmt(atom.y)}" r="${fmt(atom.screenRadius)}" fill="url(#${atomGradientId(atom.atom)})" stroke="rgba(20, 24, 32, 0.28)" stroke-width="${fmt(Math.max(0.75, atom.screenRadius * 0.035))}"/>`,
      `<text x="${fmt(atom.x)}" y="${fmt(atom.y + atom.screenRadius * 0.18)}" text-anchor="middle" font-size="${fmt(Math.max(8, atom.screenRadius * 0.48))}" font-weight="700" fill="${labelColor(atom.atom.symbol)}">${escapeText(atom.atom.symbol)}</text>`,
    ].join(""),
  }))
}

function bondPrimitives(
  structure: StructureModel,
  atomIndex: ReadonlyMap<number, ProjectedAtom>,
  options: FigureOptions,
): readonly SvgPrimitive[] {
  if (!options.showBonds) {
    return []
  }
  return structure.bonds.flatMap((bond) => {
    const from = atomIndex.get(bond.from)
    const to = atomIndex.get(bond.to)
    if (!from || !to) {
      return []
    }
    const width = Math.max(
      2,
      Math.min(from.screenRadius, to.screenRadius) * 0.22 * options.bondScale,
    )
    return [
      {
        depth: (from.depth + to.depth) / 2,
        markup: `<line x1="${fmt(from.x)}" y1="${fmt(from.y)}" x2="${fmt(to.x)}" y2="${fmt(to.y)}" stroke="#d6d9df" stroke-width="${fmt(width)}" stroke-linecap="round"/>`,
      },
    ]
  })
}

function cellPrimitives(
  structure: StructureModel,
  project: (point: Vec3) => ProjectedPoint,
  options: FigureOptions,
): readonly SvgPrimitive[] {
  if (!options.showCell || !structure.cell) {
    return []
  }
  return cellEdges(structure.cell).map(([from, to]) => {
    const a = project(from)
    const b = project(to)
    return {
      depth: (a.depth + b.depth) / 2 - 0.001,
      markup: `<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" stroke="#3b475a" stroke-width="1.35" stroke-dasharray="5 4" stroke-linecap="round" opacity="0.72"/>`,
    }
  })
}

function makeCellCorners(cell: readonly [Vec3, Vec3, Vec3]): readonly Vec3[] {
  const zero: Vec3 = [0, 0, 0]
  const a = cell[0]
  const b = cell[1]
  const c = cell[2]
  return [zero, a, b, c, add(a, b), add(a, c), add(b, c), add(add(a, b), c)]
}

function cellEdges(cell: readonly [Vec3, Vec3, Vec3]): readonly (readonly [Vec3, Vec3])[] {
  const zero: Vec3 = [0, 0, 0]
  const a = cell[0]
  const b = cell[1]
  const c = cell[2]
  return [
    [zero, a],
    [zero, b],
    [zero, c],
    [a, add(a, b)],
    [a, add(a, c)],
    [b, add(a, b)],
    [b, add(b, c)],
    [c, add(a, c)],
    [c, add(b, c)],
    [add(a, b), add(add(a, b), c)],
    [add(a, c), add(add(a, b), c)],
    [add(b, c), add(add(a, b), c)],
  ]
}

function atomGradientId(atom: AtomModel): string {
  return `atom-${atom.index}`
}

function shade(hex: string, amount: number): string {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) =>
    Number.parseInt(part, 16),
  )
  if (channels.some((channel) => !Number.isFinite(channel))) {
    return hex
  }
  const next = channels.map((channel) => {
    const target = amount >= 0 ? 255 : 0
    return Math.round(channel + (target - channel) * Math.abs(amount))
  })
  return `#${next.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

function labelColor(symbol: string): string {
  return symbol === "H" ? "#303642" : "rgba(255,255,255,0.92)"
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
