import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { findUpload, uploadPath } from '../uploadSlug.js'
import data from './uploads.json' with { type: 'json' }

const { uploads } = data

test('every upload has what its patch and page show', () => {
  for (const upload of uploads) {
    assert.ok(upload.title, `upload ${upload.id} has no title`)
    assert.ok(Number.isInteger(upload.year), `upload ${upload.id} has no year`)
    assert.ok(upload.submitter, `upload ${upload.id} has no submitter`)
  }
})

test('upload photos are files in public/, not links that can expire', () => {
  for (const { id, image_url } of uploads) {
    assert.match(image_url, /^\//, `upload ${id} links to ${image_url}`)
    const file = new URL(`../../public${image_url}`, import.meta.url)
    assert.ok(existsSync(file), `upload ${id}: ${image_url} is missing from public/`)
  }
})

test("each upload's shareable URL opens that upload", () => {
  for (const upload of uploads) {
    const [, submitter, slug] = uploadPath(upload).split('/')
    assert.equal(findUpload(uploads, submitter, slug), upload)
  }
  assert.equal(uploadPath(uploads[0]), '/omayeli/swimming-at-yankari-games-reserve-2008')
})
