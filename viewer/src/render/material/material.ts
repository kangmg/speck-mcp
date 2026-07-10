import { type DrawCall, type Program, type App } from "picogl";
import type { Rectangle, Resolution } from "../../types";
import { State } from "../../state";
import { mat4 } from "gl-matrix";
import type { Geometry } from "../geometry/geometry";
import { AtomsProgramSrc } from "./atoms-program-src";
import { BondsProgramSrc } from "./bonds-program-src";

export class Material {
  static AtomsProgramSrc = AtomsProgramSrc;
  static BondsProgramSrc = BondsProgramSrc;

  pico: App;
  geometry: Geometry;

  atomsDrawCall: DrawCall;
  bondsDrawCall?: DrawCall;
  cellDrawCall?: DrawCall;

  constructor(
    pico: App,
    geometry: Geometry,
    atomsProgram: Program,
    bondsProgram: Program,
  ) {
    this.pico = pico;

    this.geometry = geometry;

    this.atomsDrawCall = this.pico.createDrawCall(
      atomsProgram,
      geometry.atomsVertexArray,
    );

    if (geometry.bondsVertexArray) {
      this.bondsDrawCall = this.pico.createDrawCall(
        bondsProgram,
        geometry.bondsVertexArray,
      );
    }

    if (geometry.cellVertexArray) {
      this.cellDrawCall = this.pico.createDrawCall(
        bondsProgram,
        geometry.cellVertexArray,
      );
    }
  }

  draw(state: State, rect: Rectangle, resolution: Resolution) {
    const range = this.geometry.range;

    const projection = mat4.create();
    mat4.ortho(
      projection,
      rect.left,
      rect.right,
      rect.bottom,
      rect.top,
      0,
      range,
    );

    const view = mat4.create();
    mat4.lookAt(view, [0, 0, 0], [0, 0, -1], [0, 1, 0]);

    const model = mat4.create();
    mat4.translate(model, model, [0, 0, -range / 2]);
    mat4.multiply(model, model, state.rotation);

    this.atomsDrawCall.uniform("uProjection", projection);
    this.atomsDrawCall.uniform("uView", view);
    this.atomsDrawCall.uniform("uModel", model);
    this.atomsDrawCall.uniform("uBottomLeft", [rect.left, rect.bottom]);
    this.atomsDrawCall.uniform("uTopRight", [rect.right, rect.top]);
    this.atomsDrawCall.uniform("uAtomScale", 2.5 * state.atomScale);
    this.atomsDrawCall.uniform("uRelativeAtomScale", state.relativeAtomScale);
    this.atomsDrawCall.uniform("uRes", [resolution.width, resolution.height]);
    this.atomsDrawCall.uniform("uDepth", range);
    this.atomsDrawCall.uniform("uAtomShade", state.atomShade);
    this.atomsDrawCall.draw();

    if (this.bondsDrawCall) {
      this.drawBonds(this.bondsDrawCall, state, rect, resolution, range, 2.5 * State.getBondRadius(state));
    }

    if (this.cellDrawCall) {
      this.drawBonds(this.cellDrawCall, state, rect, resolution, range, 0.035);
    }
  }

  drawBonds(
    drawCall: DrawCall,
    state: State,
    rect: Rectangle,
    resolution: Resolution,
    range: number,
    radius: number,
  ) {
    const projection = mat4.create();
    mat4.ortho(projection, rect.left, rect.right, rect.bottom, rect.top, 0, range);

    const view = mat4.create();
    mat4.lookAt(view, [0, 0, 0], [0, 0, -1], [0, 1, 0]);

    const model = mat4.create();
    mat4.translate(model, model, [0, 0, -range / 2]);
    mat4.multiply(model, model, state.rotation);

    drawCall.uniform("uProjection", projection);
    drawCall.uniform("uView", view);
    drawCall.uniform("uModel", model);
    drawCall.uniform("uBottomLeft", [rect.left, rect.bottom]);
    drawCall.uniform("uTopRight", [rect.right, rect.top]);
    drawCall.uniform("uRotation", state.rotation);
    drawCall.uniform("uDepth", range);
    drawCall.uniform("uRes", [resolution.width, resolution.height]);
    drawCall.uniform("uBondRadius", radius);
    drawCall.uniform("uBondShade", state.bondShade);
    drawCall.uniform("uAtomScale", 2.5 * state.atomScale);
    drawCall.uniform("uRelativeAtomScale", state.relativeAtomScale);
    drawCall.draw();
  }
}
