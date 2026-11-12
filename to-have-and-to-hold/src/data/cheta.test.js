import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchArchiveRecords, findPlace, recordToEvent } from './cheta.js'

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

test('events without a file get a placeholder on odd ids, a text patch on even', () => {
  const odd = recordToEvent({ ...record, id: 7, file: [] })
  const even = recordToEvent({ ...record, id: 8, file: [] })
  assert.match(odd.image_url, /^https:\/\/picsum\.photos\/seed\/cheta-7\//)
  assert.equal(even.image_url, null)
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
