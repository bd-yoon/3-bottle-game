export function distance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function normalize(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}
