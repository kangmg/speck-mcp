import * as lz from "lz-string";

import { Renderer } from "./render/renderer";
import { State } from "./state";
import { Data } from "./data";
import { addRenderFolder } from "./ui/folder-render";
import { createMouseController } from "./ui/mouse-controller";
import { addPane } from "./ui/pane";
import { addShareFolder } from "./ui/folder-share";

import "./style.css";
import type { Structure } from "./types";
import { mat4 } from "gl-matrix";

declare global {
  interface Window {
    __speckExportReady?: boolean;
  }
}

const canvas = document.getElementById("renderer-canvas") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const renderContainer = document.getElementById("render-container")!;

let state = State.create();

let initialCustom: Structure | undefined;
let exportMode = false;
const exportSampleTarget = 768;
const hash = location.hash.slice(1, location.hash.length);

if (hash) {
  try {
    const data = JSON.parse(lz.decompressFromEncodedURIComponent(hash));
    exportMode = data.exportMode === true;
    if (data.source) {
      initialCustom = Data.Structures.createFromText(
        data.source,
        data.format ?? "auto",
        data.view ?? "top",
      ) ?? undefined;
    } else {
      initialCustom = data.structure;
    }
    const hashState = data.state ?? {};
    state = {
      ...state,
      ...hashState,
      rotation: mat4.clone(hashState.rotation ?? state.rotation),
      windowResolution: state.windowResolution,
    };
    if (hashState.cameraTheta !== undefined || hashState.cameraPhi !== undefined) {
      State.setCameraAngles(state, state.cameraTheta, state.cameraPhi);
    }
  } catch (e) {
    console.error("Could not parse url.");
  }
}

const renderer = await Renderer.create(canvas, state);

//

let needReset = false;
function onReset() {
  needReset = true;
}

if (initialCustom) {
  State.center(state, initialCustom);
  renderer.setStructure(initialCustom, state);
}

if (exportMode) {
  function exportLoop() {
    renderer.render(state);
    if (renderer.sampleCount < exportSampleTarget) {
      requestAnimationFrame(exportLoop);
      return;
    }
    requestAnimationFrame(() => {
      window.__speckExportReady = true;
    });
  }

  exportLoop();
} else {
  const pane = addPane();
  addRenderFolder({
    pane,
    renderer,
    state,
    onReset,
  });
  addShareFolder({ pane, renderer, state, canvas });

  createMouseController({
    renderer,
    renderContainer,
    state,
    onReset,
  });

  window.addEventListener("resize", () => {
    state.windowResolution = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    state.aspect = window.innerWidth / window.innerHeight;
    renderer.setResolution(state);
    needReset = true;
  });

  function loop() {
    if (needReset) {
      renderer.reset();
      needReset = false;
    }

    renderer.render(state);
    requestAnimationFrame(loop);
  }

  loop();
}
