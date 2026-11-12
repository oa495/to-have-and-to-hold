// Links to a year on the timeline: /timeline#1994.

export function yearHash(year) {
  return `#${year}`
}

// The year a location hash points at, or null if it isn't a year.
export function yearFromHash(hash) {
  const match = /^#(\d{1,4})$/.exec(hash)
  return match ? Number(match[1]) : null
}
