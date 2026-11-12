// Nigeria is assumed, so a location that is just "Nigeria" isn't shown.
// Anything more specific ("Lagos, Nigeria") still is.
export function shownLocation(location) {
  const trimmed = location?.trim()
  if (!trimmed || trimmed.toLowerCase() === 'nigeria') return null
  return trimmed
}
