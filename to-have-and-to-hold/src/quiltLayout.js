// Where patches sit in a year's quilt: which events show, in what order, and
// how far each is nudged off the grid. All seeded, so a patch sits the same
// way on every load.

// A repeatable value in [-1, 1] per seed.
export function wobble(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

// Largest nudge off the grid, as a share of one grid cell. Wider sideways,
// where the column gap leaves room, than up and down, so patches in the top
// and bottom rows stay on screen.
export const MAX_SHIFT_X = 0.35
export const MAX_SHIFT_Y = 0.15

// A patch's nudge in grid cells ({ x, y }) and tilt in degrees.
export function patchOffset(seed, tilt) {
  return {
    x: wobble(seed) * MAX_SHIFT_X,
    y: wobble(seed + 1) * MAX_SHIFT_Y,
    rotate: wobble(seed + 2) * tilt,
  }
}

// Grid placement plus the nudge, in --cell units so it scales with the screen.
export function patchStyle([cols, rows], seed, tilt) {
  const { x, y, rotate } = patchOffset(seed, tilt)
  return {
    gridColumn: `span ${cols}`,
    gridRow: `span ${rows}`,
    transform: `translate(calc(var(--cell) * ${x}), calc(var(--cell) * ${y})) rotate(${rotate}deg)`,
  }
}

const EVENTS_PER_YEAR = 4

// A year's events, cut to EVENTS_PER_YEAR: one per significance level from
// the top down, so each year shows a spread of patch sizes, topped up with
// the most significant of the rest. Within a level, events with a photo come
// first so photo patches show at every size. Then shuffled by a seed per
// event, so big and small patches don't land in the same rows every year.
export function pickEvents(yearEvents) {
  const bySignificance = [...yearEvents].sort(
    (a, b) =>
      (b.significance ?? 1) - (a.significance ?? 1) || Boolean(b.image_url) - Boolean(a.image_url),
  )
  const levels = new Set()
  const picked = bySignificance.filter((e) => {
    const level = e.significance ?? 1
    if (levels.has(level)) return false
    levels.add(level)
    return true
  })
  for (const e of bySignificance) {
    if (picked.length >= EVENTS_PER_YEAR) break
    if (!picked.includes(e)) picked.push(e)
  }
  // Seeds id * 11 + 5 stay clear of the id, id + 1, id + 2 used for nudges.
  const order = (e) => wobble(e.id * 11 + 5)
  return picked.slice(0, EVENTS_PER_YEAR).sort((a, b) => order(a) - order(b))
}
