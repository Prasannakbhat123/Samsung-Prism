// Class colours match the server's exported masks (server/store.py CLASS_COLORS_BGR).
const CLASS_COLORS = {
  1: '#ff0000', 2: '#0000ff', 3: '#00ff00', 4: '#00ffff',
  5: '#ff00ff', 6: '#ffff00', 7: '#800080', 8: '#00a5ff',
}

export const CLASS_OPTIONS = Object.keys(CLASS_COLORS)

export function classColor(className) {
  if (CLASS_COLORS[className]) return CLASS_COLORS[className]
  let h = 0
  for (const c of String(className)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `hsl(${h % 360} 80% 60%)`
}
