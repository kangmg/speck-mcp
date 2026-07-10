import { z } from "zod/v4"

export const sourceKindSchema = z.enum(["text", "path"]).default("path")
export const renderFormatSchema = z.enum(["png", "svg"]).default("png")
export const cameraViewSchema = z.enum(["top", "side-a", "side-b", "free"]).default("top")

export const cameraSchema = z
  .object({
    theta: z.number().default(0),
    phi: z.number().default(0),
    zoom: z.number().positive().default(1),
  })
  .default({ theta: 0, phi: 0, zoom: 1 })

export const figureOptionsSchema = z.object({
  width: z.number().int().min(320).max(4800).default(1200),
  height: z.number().int().min(240).max(4800).default(900),
  camera: cameraSchema,
  view: cameraViewSchema,
  renderScale: z.number().positive().min(1).max(8).default(2),
  showCell: z.boolean().default(true),
  showBonds: z.boolean().default(true),
  transparent: z.boolean().default(false),
  background: z.string().default("#ffffff"),
  atomScale: z.number().positive().default(1),
  bondScale: z.number().positive().default(1),
  title: z.string().optional(),
})

export const structureInputSchema = z.object({
  source: z.string().min(1),
  sourceKind: sourceKindSchema,
  format: z.string().optional(),
  name: z.string().optional(),
})

export const renderImageSchema = structureInputSchema.extend({
  outputPath: z.string().optional(),
  formatOut: renderFormatSchema,
  options: figureOptionsSchema.default({
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
  }),
})

export const viewerHtmlSchema = structureInputSchema.extend({
  outputPath: z.string().default(".tmp/viewer.html"),
  options: figureOptionsSchema.partial().default({}),
})

export type RenderImageArgs = z.infer<typeof renderImageSchema>
export type ViewerHtmlArgs = z.infer<typeof viewerHtmlSchema>
export type StructureInputArgs = z.infer<typeof structureInputSchema>
