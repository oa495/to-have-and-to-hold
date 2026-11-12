// Records from the Cheta archive (https://www.cheta.africa), mapped to the
// event and upload shapes the timeline uses.

// Cheta's API sends no CORS headers, so requests go through a same-origin
// proxy: vite.config.js in dev, public/_redirects in production.
const API = '/cheta-api'

// A Brief History of Nigerian Headlines.
export const EVENTS_ARCHIVE_ID = 19
// To Have and To Hold Workshop.
export const UPLOADS_ARCHIVE_ID = 20

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

// Records without a date can't go on the timeline, so both mappers return null.
export function recordToEvent(record) {
  const year = recordYear(record)
  if (year === null) return null
  return {
    id: record.id,
    image_url: recordImage(record) ?? (record.id % 2 ? placeholderImage(record.id, 600, 400) : null),
    title: record.title,
    desc: record.description ?? '',
    year,
    // Cheta has no significance field yet; every event is the smallest block.
    significance: 1,
    location: record.location ?? null,
  }
}

export function recordToUpload(record) {
  const year = recordYear(record)
  if (year === null) return null
  return {
    id: record.id,
    image_url: recordImage(record) ?? placeholderImage(record.id, 800, 600),
    title: record.title,
    description: record.description ?? '',
    year,
    submitter: record.authors || 'Anonymous',
    location: record.location ?? null,
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

function mapRecords(records, toItem) {
  return records.map(toItem).filter(Boolean)
}

// Fetched once per page load and shared by the timeline and upload pages.
let cache
export function loadArchives() {
  cache ??= Promise.all([
    fetchArchiveRecords(EVENTS_ARCHIVE_ID),
    fetchArchiveRecords(UPLOADS_ARCHIVE_ID),
  ]).then(([eventRecords, uploadRecords]) => ({
    events: mapRecords(eventRecords, recordToEvent),
    uploads: mapRecords(uploadRecords, recordToUpload),
  }))
  // Let a failed load be retried on the next visit.
  cache.catch(() => {
    cache = undefined
  })
  return cache
}
