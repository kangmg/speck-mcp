import { readAll } from "ase-ts/browser";
import { Config } from "../config";
import type { Atom, Bond, Position, Structure } from "../types";
import { Atoms } from "./atoms";
import { Bonds } from "./bonds";

type AseReadOptions = {
  data: true;
  format?: string;
};

type CameraView = "top" | "side-a" | "side-b" | "free";

type Cell = [Position, Position, Position];

type CellLengths = {
  a: number;
  b: number;
  c: number;
};

type ParsedStructure = {
  atoms: Array<Atom>;
  cell: Cell | undefined;
};

function createFromText(text: string, format = "auto", view: CameraView = "top"): Structure | null {
  const frame = readFirstFrame(text, format);
  const parsed = alignToCellView(
    {
      atoms: createAtoms(frame),
      cell: createCell(frame),
    },
    view,
  );
  if (parsed.atoms.length === 0) return null;

  const centroid = getCentroid(parsed.atoms);
  const centeredAtoms = parsed.atoms.map((atom) => ({
    symbol: atom.symbol,
    x: atom.x - centroid.x,
    y: atom.y - centroid.y,
    z: atom.z - centroid.z,
  }));

  const bonds = Bonds.createFromAtoms(centeredAtoms);
  const cellBonds = parsed.cell ? createCellBonds(parsed.cell, scalePosition(centroid, -1)) : [];
  const radius = calculateRadius(centeredAtoms, cellBonds);

  return {
    radius,
    atoms: centeredAtoms,
    bonds,
    cellBonds,
    cell: parsed.cell,
  };
}

function createAtoms(frame: ReturnType<typeof readFirstFrame>): Array<Atom> {
  const positions = frame.getPositions(false);
  return frame.getChemicalSymbols().map((symbol, index) => {
    const position = positions[index];
    if (!position) {
      throw new Error(`Missing position for atom ${index}`);
    }
    return {
      symbol,
      x: position[0],
      y: position[1],
      z: position[2],
    };
  });
}

function createCell(frame: ReturnType<typeof readFirstFrame>): Cell | undefined {
  const matrix = frame.getCell(false);
  if (!matrix.some((row) => row.some((value) => Math.abs(value) > 1e-9))) {
    return undefined;
  }
  return [
    toPosition(matrix[0]),
    toPosition(matrix[1]),
    toPosition(matrix[2]),
  ];
}

function alignToCellView(parsed: ParsedStructure, view: CameraView): ParsedStructure {
  if (view === "free" || !parsed.cell) {
    return parsed;
  }

  const cell = parsed.cell;
  const volume = dotPosition(cell[0], crossPosition(cell[1], cell[2]));
  if (Math.abs(volume) < 1e-9) {
    return parsed;
  }

  const lengths = {
    a: length(cell[0]),
    b: length(cell[1]),
    c: length(cell[2]),
  };

  return {
    atoms: parsed.atoms.map((atom) => {
      const fractional = fractionalPosition(atom, cell, volume);
      const position = positionForView(fractional, lengths, view);
      return {
        symbol: atom.symbol,
        x: position.x,
        y: position.y,
        z: position.z,
      };
    }),
    cell: cellForView(lengths, view),
  };
}

function fractionalPosition(position: Position, cell: Cell, volume: number): Position {
  return {
    x: dotPosition(position, crossPosition(cell[1], cell[2])) / volume,
    y: dotPosition(position, crossPosition(cell[2], cell[0])) / volume,
    z: dotPosition(position, crossPosition(cell[0], cell[1])) / volume,
  };
}

function positionForView(fractional: Position, lengths: CellLengths, view: CameraView): Position {
  switch (view) {
    case "top":
      return { x: fractional.x * lengths.a, y: fractional.y * lengths.b, z: fractional.z * lengths.c };
    case "side-a":
      return { x: fractional.y * lengths.b, y: fractional.z * lengths.c, z: fractional.x * lengths.a };
    case "side-b":
      return { x: fractional.x * lengths.a, y: fractional.z * lengths.c, z: fractional.y * lengths.b };
    case "free":
      return fractional;
    default:
      return assertNever(view);
  }
}

function cellForView(lengths: CellLengths, view: CameraView): Cell {
  switch (view) {
    case "top":
      return [
        { x: lengths.a, y: 0, z: 0 },
        { x: 0, y: lengths.b, z: 0 },
        { x: 0, y: 0, z: lengths.c },
      ];
    case "side-a":
      return [
        { x: 0, y: 0, z: lengths.a },
        { x: lengths.b, y: 0, z: 0 },
        { x: 0, y: lengths.c, z: 0 },
      ];
    case "side-b":
      return [
        { x: lengths.a, y: 0, z: 0 },
        { x: 0, y: 0, z: lengths.b },
        { x: 0, y: lengths.c, z: 0 },
      ];
    case "free":
      return [
        { x: lengths.a, y: 0, z: 0 },
        { x: 0, y: lengths.b, z: 0 },
        { x: 0, y: 0, z: lengths.c },
      ];
    default:
      return assertNever(view);
  }
}

function createCellBonds(cell: Cell, origin: Position): Array<Bond> {
  const a = cell[0];
  const b = cell[1];
  const c = cell[2];
  const oa = addPosition(origin, a);
  const ob = addPosition(origin, b);
  const oc = addPosition(origin, c);
  const oab = addPosition(oa, b);
  const oac = addPosition(oa, c);
  const obc = addPosition(ob, c);
  const oabc = addPosition(oab, c);
  return [
    [origin, oa],
    [origin, ob],
    [origin, oc],
    [oa, oab],
    [oa, oac],
    [ob, oab],
    [ob, obc],
    [oc, oac],
    [oc, obc],
    [oab, oabc],
    [oac, oabc],
    [obc, oabc],
  ].map(([posA, posB]) => createCellBond(posA, posB));
}

function createCellBond(posA: Position, posB: Position): Bond {
  return {
    posA,
    posB,
    radA: 0.08,
    radB: 0.08,
    colA: { r: 0.42, g: 0.48, b: 0.56 },
    colB: { r: 0.42, g: 0.48, b: 0.56 },
    cutoff: 0,
    kind: "cell",
  };
}

function readFirstFrame(text: string, format: string) {
  const options: AseReadOptions = format === "auto" ? { data: true } : { data: true, format };
  const frames = readAll(text, options);
  const frame = frames[0];
  if (!frame) {
    throw new Error("No structure frames were parsed");
  }
  return frame;
}

function getCentroid(atoms: Array<Atom>): Position {
  return Atoms.getCentroid(atoms);
}

function calculateRadius(atoms: Array<Atom>, cellBonds: Array<Bond>): number {
  const atomRadius = Atoms.calculateRadius(atoms);
  const cellRadius = Math.max(
    0,
    ...cellBonds.flatMap((bond) => [
      length(bond.posA) + 2.5 * Config.minAtomRadius,
      length(bond.posB) + 2.5 * Config.minAtomRadius,
    ]),
  );
  return Math.max(atomRadius, cellRadius);
}

function toPosition(values: readonly number[]): Position {
  return {
    x: values[0] ?? 0,
    y: values[1] ?? 0,
    z: values[2] ?? 0,
  };
}

function addPosition(a: Position, b: Position): Position {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function crossPosition(a: Position, b: Position): Position {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dotPosition(a: Position, b: Position): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function scalePosition(position: Position, factor: number): Position {
  return {
    x: position.x * factor,
    y: position.y * factor,
    z: position.z * factor,
  };
}

function length(position: Position): number {
  return Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported camera view: ${value}`);
}

export const Structures = {
  createFromText,
};
