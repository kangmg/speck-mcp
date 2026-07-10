export type Vec3 = readonly [number, number, number]
export type Mat3 = readonly [Vec3, Vec3, Vec3]

export type Camera = {
  readonly theta: number
  readonly phi: number
  readonly zoom: number
}

export type CameraView = "top" | "side-a" | "side-b" | "free"

export type FigureOptions = {
  readonly width: number
  readonly height: number
  readonly camera: Camera
  readonly view: CameraView
  readonly renderScale: number
  readonly showCell: boolean
  readonly showBonds: boolean
  readonly transparent: boolean
  readonly background: string
  readonly atomScale: number
  readonly bondScale: number
  readonly title?: string | undefined
}

export type FigureOptionPatch = {
  readonly width?: number | undefined
  readonly height?: number | undefined
  readonly camera?: Partial<Camera> | undefined
  readonly view?: CameraView | undefined
  readonly renderScale?: number | undefined
  readonly showCell?: boolean | undefined
  readonly showBonds?: boolean | undefined
  readonly transparent?: boolean | undefined
  readonly background?: string | undefined
  readonly atomScale?: number | undefined
  readonly bondScale?: number | undefined
  readonly title?: string | undefined
}

export type AtomModel = {
  readonly index: number
  readonly symbol: string
  readonly position: Vec3
  readonly radius: number
  readonly color: string
}

export type BondModel = {
  readonly from: number
  readonly to: number
  readonly order: number
}

export type StructureModel = {
  readonly name: string
  readonly formula: string
  readonly atoms: readonly AtomModel[]
  readonly bonds: readonly BondModel[]
  readonly cell: Mat3 | null
  readonly pbc: readonly [boolean, boolean, boolean]
}

export type StructureInput = {
  readonly source: string
  readonly sourceKind: "text" | "path"
  readonly format?: string | undefined
  readonly name?: string | undefined
}

export type RenderFormat = "png" | "svg"

export type RenderRequest = StructureInput & {
  readonly outputPath?: string | undefined
  readonly formatOut: RenderFormat
  readonly options: FigureOptions
}

export type RenderResult = {
  readonly path: string
  readonly mimeType: "image/png" | "image/svg+xml"
  readonly data: string
  readonly structure: StructureModel
}
