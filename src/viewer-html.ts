import { readFile } from "node:fs/promises"
import path from "node:path"
import lz from "lz-string"
import type { FigureOptionPatch, StructureInput } from "./types.js"

export async function createViewerHtml(
  input: StructureInput,
  options: FigureOptionPatch,
  exportMode = false,
): Promise<string> {
  const source = input.sourceKind === "path" ? await readFile(input.source, "utf8") : input.source
  const payload = {
    source,
    format: input.format ?? "auto",
    view: options.view ?? "top",
    exportMode,
    state: modernStatePatch(options),
  }
  const hash = lz.compressToEncodedURIComponent(JSON.stringify(payload))
  const dist = path.resolve("viewer/dist")
  const index = await readFile(path.join(dist, "index.html"), "utf8")
  const cssPath = assetPath(index, /href="\.\/(assets\/[^"]+\.css)"/)
  const jsPath = assetPath(index, /src="\.\/(assets\/[^"]+\.js)"/)
  const css = cssPath ? await readFile(path.join(dist, cssPath), "utf8") : ""
  const js = jsPath ? await readFile(path.join(dist, jsPath), "utf8") : ""

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>modern-speck MCP viewer</title>
<style>${css}</style>
</head>
<body>
${indexBody(index)}
<script>if (!location.hash) history.replaceState(null, "", "#${escapeAttr(hash)}");</script>
<script type="module">${js}</script>
</body>
</html>`
}

function modernStatePatch(options: FigureOptionPatch): Record<string, unknown> {
  const camera = options.camera ?? {}
  return {
    cameraTheta: camera.theta ?? 0,
    cameraPhi: camera.phi ?? 0,
    zoom: camera.zoom ? 0.125 * camera.zoom : 0.125,
    bonds: options.showBonds ?? true,
    cell: options.showCell ?? true,
    atomScale: 0.5 * (options.atomScale ?? 1),
    bondScale: 0.5 * (options.bondScale ?? 1),
    bondThreshold: 1.05,
    resolutionScale: 1,
    spf: 32,
    fxaa: 1,
  }
}

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function assetPath(index: string, pattern: RegExp): string | null {
  return pattern.exec(index)?.[1] ?? null
}

function indexBody(index: string): string {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(index)?.[1] ?? ""
  return body
    .replace(/<script[^>]+src="\.\/assets\/[^"]+\.js"[^>]*><\/script>/g, "")
    .replace(/<link[^>]+href="\.\/assets\/[^"]+\.css"[^>]*>/g, "")
}
