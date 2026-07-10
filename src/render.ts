import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"
import { parseStructure } from "./structure.js"
import { renderSvg } from "./svg-renderer.js"
import type { RenderRequest, RenderResult } from "./types.js"
import { createViewerHtml } from "./viewer-html.js"

type CaptureOptions = {
  readonly url: string
  readonly outputPath: string
  readonly width: number
  readonly height: number
  readonly renderScale: number
}

export async function renderStructureImage(request: RenderRequest): Promise<RenderResult> {
  const structure = parseStructure(request)
  const outputPath = resolveOutputPath(request.outputPath, structure.formula, request.formatOut)
  await mkdir(path.dirname(outputPath), { recursive: true })

  if (request.formatOut === "svg") {
    const svg = renderSvg(structure, request.options)
    await writeFile(outputPath, svg, "utf8")
    return {
      path: outputPath,
      mimeType: "image/svg+xml",
      data: Buffer.from(svg, "utf8").toString("base64"),
      structure,
    }
  }

  await renderModernSpeckPng(request, outputPath)
  const data = await readFile(outputPath, { encoding: "base64" })
  return {
    path: outputPath,
    mimeType: "image/png",
    data,
    structure,
  }
}

async function renderModernSpeckPng(request: RenderRequest, outputPath: string): Promise<void> {
  const htmlPath = path.resolve(".tmp", "modern-speck-render.html")
  await mkdir(path.dirname(htmlPath), { recursive: true })
  await writeFile(htmlPath, await createViewerHtml(request, request.options), "utf8")
  await captureCanvas({
    url: pathToFileURL(htmlPath).href,
    outputPath,
    width: request.options.width,
    height: request.options.height,
    renderScale: request.options.renderScale,
  })
}

async function captureCanvas(options: CaptureOptions): Promise<void> {
  const width = Math.round(options.width * options.renderScale)
  const height = Math.round(options.height * options.renderScale)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(options.url, { waitUntil: "load" })
    await page.waitForSelector("canvas#renderer-canvas", { state: "attached" })
    await page.waitForFunction(() => {
      const canvas = document.querySelector("canvas#renderer-canvas")
      if (!canvas) {
        return false
      }
      const rect = canvas.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    await page.waitForTimeout(3500)
    await page.addStyleTag({
      content:
        "html,body,#render-container{background:transparent!important}#controls-container{display:none!important}",
    })
    const box = await page.evaluate(() => {
      const canvas = document.querySelector("canvas#renderer-canvas")
      if (!canvas) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    })
    if (!box) {
      throw new Error("renderer canvas bounds were not available")
    }
    await page.screenshot({
      path: options.outputPath,
      clip: box,
      omitBackground: true,
    })
  } finally {
    await browser.close()
  }
}

function resolveOutputPath(
  outputPath: string | undefined,
  formula: string,
  format: string,
): string {
  if (outputPath) {
    return path.resolve(outputPath)
  }
  const safeFormula = formula.replace(/[^A-Za-z0-9_-]+/g, "_")
  return path.resolve(".tmp", `${safeFormula || "structure"}.${format}`)
}
