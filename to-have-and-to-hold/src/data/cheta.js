// Timeline events and uploads from the Cheta archive
// (https://www.cheta.africa), mapped to the shapes the timeline uses.
import placeList from './nigeria-places.json' with { type: 'json' }

const { places } = placeList

// Cheta's API sends no CORS headers, so requests go through a same-origin
// proxy: vite.config.js in dev, public/_redirects in production.
const API = '/cheta-api'

// A Brief History of Nigerian Headlines.
export const EVENTS_ARCHIVE_ID = 19
// To Have and To Hold Workshop: participants' photos.
export const UPLOADS_ARCHIVE_ID = 20

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

function recordYear(record) {
  if (!record.dateRange) return null
  const year = new Date(record.dateRange).getUTCFullYear()
  return Number.isNaN(year) ? null : year
}

// With depth=1 each file is an expanded media object; with depth=0 it's an id.
// File names can contain spaces ("IMG 2.JPG"), so the URL is normalised:
// spaces become %20, anything already escaped is left alone.
function recordImage(record) {
  const file = record.file?.find((f) => typeof f === 'object' && f?.url)
  if (!file) return null
  try {
    return new URL(file.url).href
  } catch {
    return null
  }
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
    // Events without a file are text-only patches.
    image_url: recordImage(record),
    title,
    desc: eventDesc(body, title),
    year,
    significance,
    // Only the title: places in descriptions are often datelines or asides,
    // not where the event happened.
    location: record.location || findPlace(title),
  }
}

// A participant's photo. Records without a date can't be placed and ones
// without a photo have nothing to show, so both map to null. The year places
// the photo and goes in its URL; date_display is what's shown ("early
// 2000s"), falling back to the year.
export function recordToUpload(record) {
  const year = recordYear(record)
  const image_url = recordImage(record)
  if (year === null || !image_url) return null
  return {
    id: record.id,
    image_url,
    title: decodeEntities(record.title),
    description: decodeEntities(record.description).trim(),
    year,
    date_display: record.dateDisplay?.trim() || String(year),
    submitter: record.authors?.trim() || 'Anonymous',
    location: record.location || null,
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

// A copy of each archive's mapped items is kept in the browser's
// localStorage, so a return visit shows the timeline at once while a fresh
// copy loads. Bump CACHE_VERSION whenever the event or upload shape changes,
// so old copies are dropped rather than shown.
const CACHE_VERSION = 1

function cacheKey(archiveId) {
  return `cheta:v${CACHE_VERSION}:archive:${archiveId}`
}

// localStorage can be missing (Node, tests) or throw (private browsing,
// blocked storage); without it nothing is cached and everything still works.
function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// The saved items for an archive, or null if there's no usable copy.
export function readCached(archiveId, storage = browserStorage()) {
  try {
    const saved = JSON.parse(storage?.getItem(cacheKey(archiveId)) ?? 'null')
    return Array.isArray(saved?.items) ? saved.items : null
  } catch {
    return null
  }
}

export function saveCached(archiveId, items, storage = browserStorage()) {
  try {
    storage?.setItem(cacheKey(archiveId), JSON.stringify({ savedAt: Date.now(), items }))
  } catch {
    // Full or blocked storage: carry on without saving.
  }
}

// Fresh items from Cheta, saved for next time. The saved copy is used
// instead when Cheta fails, or returns nothing where we had something (an
// archive set to private reads as empty). Only throws with no saved copy.
export async function fetchWithCache(archiveId, toItem, { fetchImpl, storage = browserStorage() } = {}) {
  const cached = readCached(archiveId, storage)
  let fresh
  try {
    const records = await fetchArchiveRecords(archiveId, fetchImpl ?? globalThis.fetch)
    fresh = records.map(toItem).filter(Boolean)
  } catch (error) {
    if (!cached) throw error
    console.warn(`Cheta archive ${archiveId}: showing saved copy`, error)
    return cached
  }
  if (!fresh.length && cached?.length) return cached
  saveCached(archiveId, fresh, storage)
  return fresh
}

// Each archive is fetched once per page load and shared by every page that
// asks for it. A failed load is forgotten so the next visit retries.
const loads = new Map()
function loadArchive(archiveId, toItem) {
  if (!loads.has(archiveId)) {
    const load = fetchWithCache(archiveId, toItem)
    load.catch(() => loads.delete(archiveId))
    loads.set(archiveId, load)
  }
  return loads.get(archiveId)
}

export function loadEvents() {
  return loadArchive(EVENTS_ARCHIVE_ID, recordToEvent)
}

export function loadUploads() {
  return loadArchive(UPLOADS_ARCHIVE_ID, recordToUpload)
}

// The saved copies, for showing something before the fresh load finishes.
export function cachedEvents() {
  return readCached(EVENTS_ARCHIVE_ID)
}

export function cachedUploads() {
  return readCached(UPLOADS_ARCHIVE_ID)
}
