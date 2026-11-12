// Timeline events from the Cheta archive (https://www.cheta.africa), mapped
// to the event shape the timeline uses. Uploads are local (uploads.json).
import placeList from './nigeria-places.json' with { type: 'json' }

const { places } = placeList

// Cheta's API sends no CORS headers, so requests go through a same-origin
// proxy: vite.config.js in dev, public/_redirects in production.
const API = '/cheta-api'

// A Brief History of Nigerian Headlines.
export const EVENTS_ARCHIVE_ID = 19

// One regex over the fixed place list, built once. Longer names come first
// so "Port Harcourt" wins over a shorter name at the same spot.
const PLACE_NAMES = new Map(places.map((name) => [name.toLowerCase(), name]))
const PLACE_PATTERN = new RegExp(
  `\\b(${[...PLACE_NAMES.values()]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'))
    .join('|')})\\b`,
  'i',
)

// The first Nigerian place named in the text, or null.
export function findPlace(text) {
  const match = PLACE_PATTERN.exec(text ?? '')
  return match ? PLACE_NAMES.get(match[1].toLowerCase()) : null
}

// Most records have no file yet. Every other one gets a placeholder photo
// so the quilt still mixes photo and text patches.
function placeholderImage(id, width, height) {
  return `https://picsum.photos/seed/cheta-${id}/${width}/${height}`
}

function recordYear(record) {
  if (!record.dateRange) return null
  const year = new Date(record.dateRange).getUTCFullYear()
  return Number.isNaN(year) ? null : year
}

// With depth=1 each file is an expanded media object; with depth=0 it's an id.
function recordImage(record) {
  const file = record.file?.find((f) => typeof f === 'object' && f?.url)
  return file?.url ?? null
}

// Archive 19 descriptions end with "Significance: <label>". The label's
// opening words set the patch size; anything else is the smallest block.
const SIGNIFICANCE_LEVELS = [
  ['major turning point', 5],
  ['significant development', 3],
  ['important event', 1],
]

// Some imported text carries HTML character references ("&#8220;", "&amp;").
// React would show them literally, so they're decoded here.
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(text) {
  return (text ?? '').replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (ref, dec, hex, name) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? ref
    const code = dec ? Number(dec) : parseInt(hex, 16)
    return code <= 0x10ffff ? String.fromCodePoint(code) : ref
  })
}

function splitDescription(description) {
  const [body, label = ''] = decodeEntities(description).split(/\n+\s*Significance:\s*/)
  const lower = label.trim().toLowerCase()
  const level = SIGNIFICANCE_LEVELS.find(([prefix]) => lower.startsWith(prefix))
  return { body: body.trim(), significance: level ? level[1] : 1 }
}

// Many descriptions just repeat the title, some behind a "Contemporary
// headline record:" prefix. Those add nothing, so they're dropped.
function eventDesc(body, title) {
  const text = body.replace(/^Contemporary headline record:\s*/i, '')
  const strip = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return strip(text) === strip(title) ? '' : text
}

// Records without a date can't go on the timeline, so they map to null.
export function recordToEvent(record) {
  const year = recordYear(record)
  if (year === null) return null
  const title = decodeEntities(record.title)
  const { body, significance } = splitDescription(record.description)
  return {
    id: record.id,
    image_url: recordImage(record) ?? (record.id % 2 ? placeholderImage(record.id, 600, 400) : null),
    title,
    desc: eventDesc(body, title),
    year,
    significance,
    // Only the title: places in descriptions are often datelines or asides,
    // not where the event happened.
    location: record.location || findPlace(title),
  }
}

// Every record in an archive, following pagination.
export async function fetchArchiveRecords(archiveId, fetchImpl = fetch) {
  const records = []
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      'where[archive][equals]': archiveId,
      limit: 100,
      page,
      depth: 1,
    })
    const res = await fetchImpl(`${API}/records?${params}`)
    if (!res.ok) throw new Error(`Cheta archive ${archiveId}: HTTP ${res.status}`)
    const body = await res.json()
    records.push(...body.docs)
    if (!body.hasNextPage) return records
  }
}

// Fetched once per page load.
let cache
export function loadEvents() {
  cache ??= fetchArchiveRecords(EVENTS_ARCHIVE_ID).then((records) =>
    records.map(recordToEvent).filter(Boolean),
  )
  // Let a failed load be retried on the next visit.
  cache.catch(() => {
    cache = undefined
  })
  return cache
}
