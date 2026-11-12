import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchArchiveRecords, recordToEvent, recordToUpload } from './cheta.js'

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
  assert.equal(recordToUpload({ ...record, dateRange: null }), null)
})

test('recordToUpload uses authors as submitter, falling back to Anonymous', () => {
  const upload = recordToUpload(record)
  assert.equal(upload.submitter, 'Tech.Felix')
  assert.equal(upload.description, 'A front view of the UNN Enugu campus.')
  assert.equal(upload.year, 2019)
  const noAuthor = recordToUpload({ ...record, authors: null, file: [] })
  assert.equal(noAuthor.submitter, 'Anonymous')
  assert.match(noAuthor.image_url, /picsum\.photos/)
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
