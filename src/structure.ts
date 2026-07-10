import type { Atoms } from "ase-ts"
import { readAll } from "ase-ts"
import { elementStyle } from "./elements.js"
import type { AtomModel, BondModel, Mat3, StructureInput, StructureModel, Vec3 } from "./types.js"
import { distance, isRealCell } from "./vector.js"

export class StructureParseError extends Error {
  readonly name = "StructureParseError"

  constructor(readonly detail: string) {
    super(`Could not parse structure: ${detail}`)
  }
}

type AseReadOptions = {
  readonly data: boolean
  readonly format?: string
}

export function parseStructure(input: StructureInput): StructureModel {
  const atoms = readFirstAtoms(input)
  const positions = atoms.getPositions(false)
  const symbols = atoms.getChemicalSymbols()

  if (symbols.length === 0) {
    throw new StructureParseError("input contains no atoms")
  }
  if (positions.length !== symbols.length) {
    throw new StructureParseError("ASE returned mismatched symbols and positions")
  }

  const atomModels = symbols.map((symbol, index) => {
    const position = positions[index]
    if (!position) {
      throw new StructureParseError(`missing position for atom ${index}`)
    }
    return atomModel(index, symbol, toVec3(position))
  })
  const cell = toCellOrNull(atoms.getCell(false))
  const pbc = toPbc(atoms.getPbc())

  return {
    name: input.name ?? "structure",
    formula: atoms.getChemicalFormula("hill"),
    atoms: atomModels,
    bonds: inferBonds(atomModels),
    cell,
    pbc,
  }
}

function readFirstAtoms(input: StructureInput): Atoms {
  const options = readOptions(input)
  const images = readAll(input.source, options)
  const first = images[0]
  if (!first) {
    throw new StructureParseError("no frames were returned by ase-ts")
  }
  return first
}

function readOptions(input: StructureInput): AseReadOptions {
  if (input.format) {
    return { data: input.sourceKind === "text", format: input.format }
  }
  return { data: input.sourceKind === "text" }
}

function atomModel(index: number, symbol: string, position: Vec3): AtomModel {
  const style = elementStyle(symbol)
  return {
    index,
    symbol,
    position,
    radius: style.radius,
    color: style.color,
  }
}

function inferBonds(atoms: readonly AtomModel[]): readonly BondModel[] {
  const bonds: BondModel[] = []
  for (const left of atoms) {
    for (const right of atoms) {
      if (right.index <= left.index) {
        continue
      }
      const cutoff = 1.25 * (left.radius + right.radius)
      const length = distance(left.position, right.position)
      if (length > 0.1 && length <= cutoff) {
        bonds.push({ from: left.index, to: right.index, order: 1 })
      }
    }
  }
  return bonds
}

function toCellOrNull(cell: readonly (readonly number[])[]): Mat3 | null {
  const first = cell[0]
  const second = cell[1]
  const third = cell[2]
  if (!first || !second || !third) {
    return null
  }
  const matrix: Mat3 = [toVec3(first), toVec3(second), toVec3(third)]
  return isRealCell(matrix) ? matrix : null
}

function toPbc(pbc: readonly boolean[]): readonly [boolean, boolean, boolean] {
  return [pbc[0] ?? false, pbc[1] ?? false, pbc[2] ?? false]
}

function toVec3(values: readonly number[]): Vec3 {
  const x = values[0]
  const y = values[1]
  const z = values[2]
  if (x === undefined || y === undefined || z === undefined) {
    throw new StructureParseError("expected a 3-vector")
  }
  return [x, y, z]
}
