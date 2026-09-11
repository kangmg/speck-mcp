import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { createServer } from "node:http"
import lz from "lz-string"
import { chromium } from "playwright"
import { createViewerHtml } from "../dist/src/viewer-html.js"

await mkdir(".tmp", { recursive: true })
const html = await createViewerHtml(
  { source: "examples/water.extxyz", sourceKind: "path", format: "extxyz" },
  { view: "top", showCell: true, showBonds: false },
)
const server = createServer((_req, res) => {
  res.setHeader("Content-Type", "text/html")
  res.end(html)
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const url = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()
try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
  })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(url)
  await page.getByText("Theta", { exact: true }).waitFor()
  await page.mouse.move(350, 300)
  await page.mouse.down()
  await page.mouse.move(440, 345, { steps: 10 })
  await page.mouse.up()
  await page.mouse.wheel(0, -120)
  await page.mouse.move(350, 300)
  await page.mouse.down({ button: "right" })
  await page.mouse.move(375, 320, { steps: 3 })
  await page.mouse.up({ button: "right" })
  await page.getByText("Share", { exact: true }).click()
  await page.getByRole("button", { name: "Copy URL", exact: true }).click()
  const shared = await page.evaluate(() => navigator.clipboard.readText())
  const first = JSON.parse(lz.decompressFromEncodedURIComponent(shared.split("#")[1]))
  assert.notEqual(first.state.cameraTheta, 0)
  assert.notEqual(first.state.cameraPhi, 0)
  await page.screenshot({ path: ".tmp/camera-before.png" })
  await page.goto(shared)
  await page.reload()
  await page.getByText("Theta", { exact: true }).waitFor()
  await page.getByText("Share", { exact: true }).click()
  await page.getByRole("button", { name: "Copy URL", exact: true }).click()
  const again = await page.evaluate(() => navigator.clipboard.readText())
  const second = JSON.parse(lz.decompressFromEncodedURIComponent(again.split("#")[1]))
  for (const key of ["rotation", "zoom", "translation", "cameraTheta", "cameraPhi"])
    assert.deepEqual(second.state[key], first.state[key], key)
  assert.deepEqual(errors, [])
  await page.screenshot({ path: ".tmp/camera-after.png" })
  console.log("Browser PASS: drag, pan, zoom, Copy URL and reload preserve camera; no page errors.")
} finally {
  await browser.close()
  server.close()
}
