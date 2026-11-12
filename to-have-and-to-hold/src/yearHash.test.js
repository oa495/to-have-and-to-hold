import assert from 'node:assert/strict'
import { test } from 'node:test'
import { yearFromHash, yearHash } from './yearHash.js'

test('yearHash links to a year', () => {
  assert.equal(yearHash(1994), '#1994')
})

test('yearFromHash reads the year back from a hash', () => {
  assert.equal(yearFromHash('#1994'), 1994)
  assert.equal(yearFromHash(yearHash(1962)), 1962)
})

test('yearFromHash returns null for anything that is not a year', () => {
  assert.equal(yearFromHash(''), null)
  assert.equal(yearFromHash('#'), null)
  assert.equal(yearFromHash('#abc'), null)
  assert.equal(yearFromHash('#19x4'), null)
  assert.equal(yearFromHash('#-1994'), null)
  assert.equal(yearFromHash('#19940'), null)
  assert.equal(yearFromHash('1994'), null)
})
