import type { Pane } from "tweakpane";

import { addInput } from "./inputs";
import type { Renderer } from "../render/renderer";
import { Config } from "../config";
import { Server } from "../server";
import { State } from "../state";
import { Data } from "../data";
import type { Structure } from "../types";

type Params = {
  pane: Pane;
  renderer: Renderer;
  state: State;
  initialCustom?: Structure;
  centerInitialCustom?: boolean;
  onReset: () => void;
};

export function addStructureFolder({
  pane,
  renderer,
  state,
  initialCustom,
  centerInitialCustom,
  onReset,
}: Params) {
  const structureFolder = pane.addFolder({ title: "Structure" });

  async function loadAndDisplay(structure?: Structure | null) {
    structure = structure || (await Server.getSampleStructure(state.file));
    if (!structure) return;

    if (!initialCustom || centerInitialCustom) State.center(state, structure);
    renderer.setStructure(structure, state);
  }

  loadAndDisplay(initialCustom);

  addInput(structureFolder, {
    label: "Sample",
    initialValue: state.file,
    options: Config.samples.map((sample) => ({
      text: sample.name,
      value: sample.file,
    })),
    onChange: async (value) => {
      state.file = value;
      await loadAndDisplay();
      onReset();
    },
  });

  structureFolder.addBlade({ view: "separator" });

  addInput(structureFolder, {
    label: "Format",
    initialValue: state.format,
    options: [
      { text: "Auto", value: "auto" },
      { text: "XYZ", value: "xyz" },
      { text: "ExtXYZ", value: "extxyz" },
      { text: "POSCAR/CONTCAR", value: "vasp" },
      { text: "CIF", value: "cif" },
      { text: "PDB", value: "pdb" },
      { text: "vasprun.xml", value: "vasprun-xml" },
      { text: "ORCA output", value: "orca-output" },
    ],
    onChange: (value) => {
      state.format = value;
    },
  });

  const customInput = addInput(structureFolder, {
    view: "textarea",
    label: "Custom",
    rows: 3,
    initialValue: "",
    placeholder: "Paste XYZ, extxyz, POSCAR, CIF, PDB...",
  });

  structureFolder
    .addButton({
      title: "Load",
    })
    .on("click", () => {
      const structure = Data.Structures.createFromText(customInput.getValue(), state.format);
      if (!structure) return;

      loadAndDisplay(structure);
      onReset();
    });
}
