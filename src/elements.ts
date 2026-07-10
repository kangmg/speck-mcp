type ElementStyle = {
  readonly radius: number
  readonly color: string
}

const fallbackStyle: ElementStyle = { radius: 0.77, color: "#8a94a6" }

const styles = new Map<string, ElementStyle>([
  ["H", { radius: 0.31, color: "#f5f7fb" }],
  ["B", { radius: 0.84, color: "#ffb366" }],
  ["C", { radius: 0.76, color: "#3b4351" }],
  ["N", { radius: 0.71, color: "#2d63ff" }],
  ["O", { radius: 0.66, color: "#e43d30" }],
  ["F", { radius: 0.57, color: "#4dbb5f" }],
  ["P", { radius: 1.07, color: "#ff8a00" }],
  ["S", { radius: 1.05, color: "#f0cc19" }],
  ["Cl", { radius: 1.02, color: "#33a02c" }],
  ["Br", { radius: 1.2, color: "#8b2f19" }],
  ["I", { radius: 1.39, color: "#6f42c1" }],
  ["Li", { radius: 1.28, color: "#cc80ff" }],
  ["Na", { radius: 1.66, color: "#ab5cf2" }],
  ["K", { radius: 2.03, color: "#8f40d4" }],
  ["Mg", { radius: 1.41, color: "#3ed14a" }],
  ["Ca", { radius: 1.76, color: "#3dff00" }],
  ["Al", { radius: 1.21, color: "#bfa6a6" }],
  ["Si", { radius: 1.11, color: "#f0a050" }],
  ["Ti", { radius: 1.6, color: "#bfc2c7" }],
  ["V", { radius: 1.53, color: "#a6a6ab" }],
  ["Cr", { radius: 1.39, color: "#8a99c7" }],
  ["Mn", { radius: 1.39, color: "#9c7ac7" }],
  ["Fe", { radius: 1.32, color: "#e06633" }],
  ["Co", { radius: 1.26, color: "#f090a0" }],
  ["Ni", { radius: 1.24, color: "#50d050" }],
  ["Cu", { radius: 1.32, color: "#c88033" }],
  ["Zn", { radius: 1.22, color: "#7d80b0" }],
  ["Ag", { radius: 1.45, color: "#c0c0c8" }],
  ["Au", { radius: 1.36, color: "#ffd123" }],
  ["Pt", { radius: 1.36, color: "#d0d0e0" }],
])

export function elementStyle(symbol: string): ElementStyle {
  return styles.get(symbol) ?? fallbackStyle
}
