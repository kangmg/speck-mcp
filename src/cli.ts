#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import { renderStructureImage } from "./render.js"
import { parseStructure } from "./structure.js"
import { mergeFigureOptions } from "./svg-renderer.js"
import type { CameraView, RenderFormat, StructureInput } from "./types.js"
import { createViewerHtml } from "./viewer-html.js"

type CliArgs = {
  readonly input: string
  readonly format?: string | undefined
  readonly output?: string | undefined
  readonly outputFormat: RenderFormat
  readonly width: number
  readonly height: number
  readonly theta: number
  readonly phi: number
  readonly zoom: number
  readonly view: CameraView
  readonly renderScale: number
  readonly atomScale: number
  readonly bondScale: number
  readonly cell: boolean
  readonly bonds: boolean
  readonly transparent: boolean
}

if (isEntrypoint()) {
  await main()
}

export async function main(): Promise<void> {
  const command = process.argv[2]
  if (command === "render") {
    await renderCommand(readCliArgs())
    return
  }
  if (command === "viewer") {
    await viewerCommand(readCliArgs())
    return
  }
  if (command === "summary") {
    summaryCommand(readCliArgs())
    return
  }
  printHelp()
}

async function renderCommand(args: CliArgs): Promise<void> {
  const result = await renderStructureImage({
    ...sourceInput(args),
    outputPath: args.output,
    formatOut: args.outputFormat,
    options: figureOptions(args),
  })
  console.log(`Rendered ${result.structure.formula} to ${result.path}`)
}

async function viewerCommand(args: CliArgs): Promise<void> {
  const outputPath = path.resolve(args.output ?? ".tmp/viewer.html")
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    await createViewerHtml(sourceInput(args), figureOptions(args)),
    "utf8",
  )
  console.log(`Viewer written to ${outputPath}`)
}

function summaryCommand(args: CliArgs): void {
  const structure = parseStructure(sourceInput(args))
  const cell = structure.cell ? "present" : "absent"
  console.log(
    `${structure.name}: ${structure.formula}; atoms=${structure.atoms.length}; bonds=${structure.bonds.length}; cell=${cell}; pbc=${structure.pbc.join(",")}`,
  )
}

function readCliArgs(): CliArgs {
  const parsed = parseArgs({
    args: process.argv.slice(3),
    options: {
      input: { type: "string", short: "i" },
      format: { type: "string", short: "f" },
      output: { type: "string", short: "o" },
      "output-format": { type: "string" },
      width: { type: "string" },
      height: { type: "string" },
      theta: { type: "string" },
      phi: { type: "string" },
      zoom: { type: "string" },
      view: { type: "string" },
      "render-scale": { type: "string" },
      "atom-scale": { type: "string" },
      "bond-scale": { type: "string" },
      cell: { type: "boolean" },
      bonds: { type: "boolean" },
      transparent: { type: "boolean" },
    },
  })
  const input = stringValue(parsed.values.input)
  if (!input) {
    throw new Error("--input is required")
  }
  return {
    input,
    format: stringValue(parsed.values.format),
    output: stringValue(parsed.values.output),
    outputFormat: outputFormat(stringValue(parsed.values["output-format"])),
    width: numberValue(parsed.values.width, 1200),
    height: numberValue(parsed.values.height, 900),
    theta: numberValue(parsed.values.theta, 0),
    phi: numberValue(parsed.values.phi, 0),
    zoom: numberValue(parsed.values.zoom, 1),
    view: cameraView(stringValue(parsed.values.view)),
    renderScale: numberValue(parsed.values["render-scale"], 2),
    atomScale: numberValue(parsed.values["atom-scale"], 1),
    bondScale: numberValue(parsed.values["bond-scale"], 1),
    cell: booleanValue(parsed.values.cell, true),
    bonds: booleanValue(parsed.values.bonds, true),
    transparent: booleanValue(parsed.values.transparent, false),
  }
}

function sourceInput(args: CliArgs): StructureInput {
  const source = path.resolve(args.input)
  if (args.format) {
    return { source, sourceKind: "path", format: args.format, name: path.basename(args.input) }
  }
  return { source, sourceKind: "path", name: path.basename(args.input) }
}

function figureOptions(args: CliArgs) {
  return mergeFigureOptions({
    width: args.width,
    height: args.height,
    camera: { theta: args.theta, phi: args.phi, zoom: args.zoom },
    view: args.view,
    renderScale: args.renderScale,
    atomScale: args.atomScale,
    bondScale: args.bondScale,
    showCell: args.cell,
    showBonds: args.bonds,
    transparent: args.transparent,
  })
}

function outputFormat(value: string | undefined): RenderFormat {
  return value === "svg" ? "svg" : "png"
}

function cameraView(value: string | undefined): CameraView {
  if (value === "side-a" || value === "side-b" || value === "free") {
    return value
  }
  return "top"
}

function stringValue(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined
}

function numberValue(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== "string") {
    return fallback
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function booleanValue(value: string | boolean | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function printHelp(): void {
  console.log(`Usage:
  speck-render summary --input structure.extxyz [--format extxyz]
  speck-render render --input POSCAR --format vasp --output figure.png --view top --render-scale 2 --cell
  speck-render viewer --input structure.cif --output viewer.html`)
}

function isEntrypoint(): boolean {
  const script = process.argv[1]
  return script !== undefined && import.meta.url === pathToFileURL(script).href
}
