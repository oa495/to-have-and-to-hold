import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findUpload, uploadPath } from '../uploadSlug.js'
import {
  fetchArchiveRecords,
  fetchWithCache,
  findPlace,
  readCached,
  recordToEvent,
  recordToUpload,
  saveCached,
} from './cheta.js'

// Shaped like a real record from /api/records?depth=1.
const record = {
  id: 24,
  title: 'UNN Enugu Campus',
  description: 'A front view of the UNN Enugu campus.',
  file: [{ url: 'https://media-staging.cheta.africa/unn.jpg', alt: 'UNN' }],
  authors: 'Tech.Felix',
  dateRange: '2019-06-13T00:00:00.000Z',
  location: 'Enugu',
}

test('recordToEvent maps Cheta fields to the event shape', () => {
  assert.deepEqual(recordToEvent(record), {
    id: 24,
    image_url: 'https://media-staging.cheta.africa/unn.jpg',
    title: 'UNN Enugu Campus',
    desc: 'A front view of the UNN Enugu campus.',
    year: 2019,
    significance: 1,
    location: 'Enugu',
  })
})

test('events without a file have no image, whatever their id', () => {
  assert.equal(recordToEvent({ ...record, id: 7, file: [] }).image_url, null)
  assert.equal(recordToEvent({ ...record, id: 8, file: null }).image_url, null)
})

test('an unexpanded file id (depth=0) counts as no image', () => {
  assert.equal(recordToEvent({ ...record, id: 8, file: [42] }).image_url, null)
})

test('records without a date are dropped', () => {
  assert.equal(recordToEvent({ ...record, dateRange: null }), null)
})

// Shaped like the archive 19 records: no location, a "Significance:" line.
function headline(title, body, label, extra = {}) {
  return {
    id: 8,
    title,
    description: `${body}\n\nSignificance: ${label}`,
    file: [],
    dateRange: '1993-06-12T00:00:00.000Z',
    location: null,
    ...extra,
  }
}

test('the significance label sets the patch size: 5 / 3 / 1', () => {
  const size = (label) => recordToEvent(headline('T', 'Body text.', label)).significance
  assert.equal(size('Major turning point in Nigeria’s political, social, economic, or cultural history.'), 5)
  assert.equal(size('Significant development that shaped national affairs.'), 3)
  assert.equal(size('Important event or episode that helps document the period.'), 1)
  assert.equal(size('Something unexpected'), 1)
  assert.equal(recordToEvent({ ...record, id: 8 }).significance, 1)
})

test('the shown description drops the significance line', () => {
  const event = recordToEvent(
    headline('2001 Jos riots', 'Religious violence between Christians and Muslims in Jos', 'Major turning point.'),
  )
  assert.equal(event.desc, 'Religious violence between Christians and Muslims in Jos')
})

test('a description that only repeats the title is left empty', () => {
  const title = 'Nigerian Military Rulers Annul Election'
  assert.equal(recordToEvent(headline(title, title, 'Major turning point.')).desc, '')
  assert.equal(
    recordToEvent(headline(title, `Contemporary headline record: ${title}.`, 'Major turning point.')).desc,
    '',
  )
})

test('a missing location is taken from the first place named in the title', () => {
  const fromTitle = recordToEvent(
    headline('Sharia Law Formally Established in Zamfara State', 'x', 'Important event.'),
  )
  assert.equal(fromTitle.location, 'Zamfara')
})

test('places named only in the description are ignored', () => {
  const event = recordToEvent(
    headline('Democracy Faces Test as Nigerian Vote Nears', 'LAGOS, Nigeria, Dec. 27—Nigeria’s…', 'Important event.'),
  )
  assert.equal(event.location, null)
})

test('HTML character references in text are decoded', () => {
  const event = recordToEvent(
    headline('Rock &amp; Roll', 'LAGOS, Nigeria, Dec. 27&#8212;the &#8220;vote&#8221; &#x2014; &bogus;', 'Important event.'),
  )
  assert.equal(event.title, 'Rock & Roll')
  assert.equal(event.desc, 'LAGOS, Nigeria, Dec. 27—the “vote” — &bogus;')})

test('a description equal to the title once decoded is left empty', () => {
  const event = recordToEvent(headline('Rock & Roll', 'Rock &amp; Roll', 'Important event.'))
  assert.equal(event.desc, '')
})

test("a record's own location wins over a matched one", () => {
  const event = recordToEvent(
    headline('Militants attack in Lagos', 'x', 'Important event.', { location: 'Warri and Port Harcourt' }),
  )
  assert.equal(event.location, 'Warri and Port Harcourt')
})

test('findPlace matches whole names only, ignoring case', () => {
  assert.equal(findPlace('NIGERIA QUELLS RIOTS IN KANO'), 'Kano')
  assert.equal(findPlace('Strikes spread in Port Harcourt and Lagos'), 'Port Harcourt')
  // "Nigeria" and "Niger" (the country) aren't places on the list.
  assert.equal(findPlace("Niger: Niger's Mainassara Visits Abacha"), null)
  assert.equal(findPlace('Nigerian Military Ruler Assumes Absolute Power'), null)
  // "Imo" inside another word doesn't count.
  assert.equal(findPlace('Immobile economy'), null)
})

// The two real records in archive 20 (To Have and To Hold), trimmed.
const portHarcourt = {
  id: 185,
  title: 'Me, my sister and our neighbours chilling',
  description: 'Me, my sister and our neighbours/friends the Karims chilling in the first house I grew up in.',
  file: [{ url: 'https://media-staging.cheta.africa/897da29d-2424-4a30-9def-fe096514fd61 2.JPG' }],
  authors: 'Chidumaga',
  dateRange: '2003-01-01T00:00:00.000Z',
  dateDisplay: 'early 2000s',
  location: 'Port Harcourt',
}
const yankari = {
  id: 184,
  title: 'Me and my brother and my “uncle” swimming at Yankari',
  description: 'Me and my brother and my “uncle” swimming at Yankari Games Reserve.',
  file: [{ url: 'https://media-staging.cheta.africa/C116E732-1282-4447-AE00-31138F9483F1.jpeg' }],
  authors: 'Omayeli',
  dateRange: '2008-01-01T00:00:00.000Z',
  dateDisplay: '2008',
  location: 'Yankari Games Reserve, Bauchi',
}

test('recordToUpload maps a Cheta photo record to the upload shape', () => {
  assert.deepEqual(recordToUpload(yankari), {
    id: 184,
    image_url: 'https://media-staging.cheta.africa/C116E732-1282-4447-AE00-31138F9483F1.jpeg',
    title: 'Me and my brother and my “uncle” swimming at Yankari',
    description: 'Me and my brother and my “uncle” swimming at Yankari Games Reserve.',
    year: 2008,
    date_display: '2008',
    submitter: 'Omayeli',
    location: 'Yankari Games Reserve, Bauchi',
  })
})

test('an upload shows its date as written but is placed by year', () => {
  const upload = recordToUpload(portHarcourt)
  assert.equal(upload.date_display, 'early 2000s')
  assert.equal(upload.year, 2003)
  assert.equal(recordToUpload({ ...portHarcourt, dateDisplay: null }).date_display, '2003')
  assert.equal(recordToUpload({ ...portHarcourt, dateDisplay: '  ' }).date_display, '2003')
})

test('spaces in photo file names are escaped, existing escapes kept', () => {
  assert.equal(
    recordToUpload(portHarcourt).image_url,
    'https://media-staging.cheta.africa/897da29d-2424-4a30-9def-fe096514fd61%202.JPG',
  )
  const escaped = { ...yankari, file: [{ url: 'https://media-staging.cheta.africa/a%20b.jpg' }] }
  assert.equal(recordToUpload(escaped).image_url, 'https://media-staging.cheta.africa/a%20b.jpg')
})

test('uploads without a date, a photo, or a valid photo URL are skipped', () => {
  assert.equal(recordToUpload({ ...yankari, dateRange: null }), null)
  assert.equal(recordToUpload({ ...yankari, file: [] }), null)
  assert.equal(recordToUpload({ ...yankari, file: [42] }), null)
  assert.equal(recordToUpload({ ...yankari, file: [{ url: 'not a url' }] }), null)
})

test('an upload with no author is credited to Anonymous, text is decoded', () => {
  const upload = recordToUpload({ ...yankari, authors: '  ', title: 'Rock &amp; Roll', location: '' })
  assert.equal(upload.submitter, 'Anonymous')
  assert.equal(upload.title, 'Rock & Roll')
  assert.equal(upload.location, null)
})

test("each real upload's shareable URL opens it", () => {
  const uploads = [portHarcourt, yankari].map(recordToUpload)
  assert.deepEqual(uploads.map(uploadPath), [
    '/chidumaga/me-my-sister-and-our-neighbours-chilling-2003',
    '/omayeli/me-and-my-brother-and-my-uncle-swimming-at-yankari-2008',
  ])
  for (const upload of uploads) {
    const [, submitter, slug] = uploadPath(upload).split('/')
    assert.equal(findUpload(uploads, submitter, slug), upload)
  }
})

test('fetchArchiveRecords filters by archive and follows every page', async () => {
  const urls = []
  const pages = { 1: { docs: [{ id: 1 }], hasNextPage: true }, 2: { docs: [{ id: 2 }], hasNextPage: false } }
  const fakeFetch = async (url) => {
    urls.push(url)
    const page = new URL(url, 'http://x').searchParams.get('page')
    return { ok: true, json: async () => pages[page] }
  }
  const records = await fetchArchiveRecords(19, fakeFetch)
  assert.deepEqual(records.map((r) => r.id), [1, 2])
  assert.equal(urls.length, 2)
  assert.equal(new URL(urls[0], 'http://x').searchParams.get('where[archive][equals]'), '19')
})

test('fetchArchiveRecords throws on an HTTP error', async () => {
  const fakeFetch = async () => ({ ok: false, status: 500 })
  await assert.rejects(fetchArchiveRecords(19, fakeFetch), /HTTP 500/)
})

// A stand-in for localStorage.
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  }
}

// A stand-in for Cheta returning these records on one page, or failing.
function chetaReturning(records) {
  return async () => ({ ok: true, json: async () => ({ docs: records, hasNextPage: false }) })
}
const chetaDown = async () => ({ ok: false, status: 503 })
const asItem = (r) => ({ id: r.id })

test('a fresh load is saved and read back on the next visit', async () => {
  const storage = memoryStorage()
  const items = await fetchWithCache(20, asItem, { fetchImpl: chetaReturning([{ id: 1 }, { id: 2 }]), storage })
  assert.deepEqual(items, [{ id: 1 }, { id: 2 }])
  assert.deepEqual(readCached(20, storage), [{ id: 1 }, { id: 2 }])
  // Archives are saved separately.
  assert.equal(readCached(19, storage), null)
})

test('a fresh load replaces the saved copy', async () => {
  const storage = memoryStorage()
  saveCached(20, [{ id: 1 }], storage)
  const items = await fetchWithCache(20, asItem, { fetchImpl: chetaReturning([{ id: 1 }, { id: 3 }]), storage })
  assert.deepEqual(items, [{ id: 1 }, { id: 3 }])
  assert.deepEqual(readCached(20, storage), [{ id: 1 }, { id: 3 }])
})

test('when Cheta fails, the saved copy is shown', async (t) => {
  t.mock.method(console, 'warn', () => {})
  const storage = memoryStorage()
  saveCached(19, [{ id: 5 }], storage)
  assert.deepEqual(await fetchWithCache(19, asItem, { fetchImpl: chetaDown, storage }), [{ id: 5 }])
})

test('when Cheta fails with nothing saved, the error comes through', async () => {
  await assert.rejects(fetchWithCache(19, asItem, { fetchImpl: chetaDown, storage: memoryStorage() }), /HTTP 503/)
})

test('an empty answer keeps the saved copy (archive gone private)', async () => {
  const storage = memoryStorage()
  saveCached(19, [{ id: 5 }], storage)
  assert.deepEqual(await fetchWithCache(19, asItem, { fetchImpl: chetaReturning([]), storage }), [{ id: 5 }])
  assert.deepEqual(readCached(19, storage), [{ id: 5 }])
})

test('an empty answer with nothing saved is just empty', async () => {
  assert.deepEqual(await fetchWithCache(20, asItem, { fetchImpl: chetaReturning([]), storage: memoryStorage() }), [])
})

test('broken, old-format or missing storage is treated as no saved copy', async () => {
  const storage = memoryStorage({
    'cheta:v1:archive:19': '{not json',
    'cheta:v1:archive:20': JSON.stringify({ items: 'nope' }),
    'cheta:v0:archive:12': JSON.stringify({ items: [{ id: 1 }] }),
  })
  assert.equal(readCached(19, storage), null)
  assert.equal(readCached(20, storage), null)
  assert.equal(readCached(12, storage), null)
  // No storage at all (private browsing, Node): loads still work.
  assert.deepEqual(await fetchWithCache(20, asItem, { fetchImpl: chetaReturning([{ id: 1 }]), storage: null }), [{ id: 1 }])
  // Storage that throws when full: saving is skipped, the load still works.
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
  assert.deepEqual(await fetchWithCache(20, asItem, { fetchImpl: chetaReturning([{ id: 1 }]), storage: full }), [{ id: 1 }])
})
