#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { renderStructureImage } from "./render.js"
import { renderImageSchema, structureInputSchema, viewerHtmlSchema } from "./schemas.js"
import { parseStructure } from "./structure.js"
import { mergeFigureOptions } from "./svg-renderer.js"
import type { RenderRequest } from "./types.js"
import { createViewerHtml } from "./viewer-html.js"

export function createServer(): McpServer {
  const server = new McpServer({
    name: "speck-mcp",
    version: "0.1.0",
  })

  server.registerTool(
    "speck_structure_summary",
    {
      title: "Summarize atomistic structure",
      description:
        "Parse XYZ, extxyz, POSCAR/CONTCAR, CIF, PDB, vasprun.xml, ORCA output, or ASE traj input and report atoms, formula, bonds, and cell status.",
      inputSchema: structureInputSchema,
    },
    async (args) => {
      const structure = parseStructure(args)
      const cell = structure.cell ? "present" : "absent"
      return {
        content: [
          {
            type: "text",
            text: `${structure.name}: ${structure.formula}; atoms=${structure.atoms.length}; bonds=${structure.bonds.length}; cell=${cell}; pbc=${structure.pbc.join(",")}`,
          },
        ],
      }
    },
  )

  server.registerTool(
    "speck_render_image",
    {
      title: "Render publication-quality structure image",
      description:
        "Render a deterministic SVG or PNG figure with camera angle, zoom, bonds, unit cell, transparent background, and paper-friendly atom styling.",
      inputSchema: renderImageSchema,
    },
    async (args) => {
      const request: RenderRequest = {
        ...args,
        options: mergeFigureOptions(args.options),
      }
      const result = await renderStructureImage(request)
      return {
        content: [
          {
            type: "text",
            text: `Rendered ${result.structure.formula} to ${result.path}`,
          },
          {
            type: "image",
            data: result.data,
            mimeType: result.mimeType,
          },
        ],
      }
    },
  )

  server.registerTool(
    "speck_viewer_html",
    {
      title: "Create interactive structure viewer",
      description:
        "Write a standalone HTML viewer with mouse rotation, camera sliders, cell/bond toggles, and SVG/PNG download controls.",
      inputSchema: viewerHtmlSchema,
    },
    async (args) => {
      const outputPath = path.resolve(args.outputPath)
      await mkdir(path.dirname(outputPath), { recursive: true })
      const html = await createViewerHtml(args, args.options)
      await writeFile(outputPath, html, "utf8")
      return {
        content: [
          {
            type: "text",
            text: `Viewer written to ${outputPath}`,
          },
        ],
      }
    },
  )

  return server
}

export async function startServer(): Promise<void> {
  const server = createServer()
  await server.connect(new StdioServerTransport())
}

if (isEntrypoint()) {
  await startServer()
}

function isEntrypoint(): boolean {
  const script = process.argv[1]
  return script !== undefined && import.meta.url === pathToFileURL(script).href
}
