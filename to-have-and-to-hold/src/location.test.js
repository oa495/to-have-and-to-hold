import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shownLocation } from './location.js'

test('shownLocation hides a location that is just Nigeria', () => {
  assert.equal(shownLocation('Nigeria'), null)
  assert.equal(shownLocation(' nigeria '), null)
})

test('shownLocation keeps other locations', () => {
  assert.equal(shownLocation('Lagos'), 'Lagos')
  assert.equal(shownLocation('Lagos, Nigeria'), 'Lagos, Nigeria')
})

test('shownLocation hides a missing or empty location', () => {
  assert.equal(shownLocation(undefined), null)
  assert.equal(shownLocation(''), null)
})
