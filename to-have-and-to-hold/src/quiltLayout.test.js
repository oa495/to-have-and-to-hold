import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_SHIFT_X, MAX_SHIFT_Y, patchOffset, patchStyle, pickEvents } from './quiltLayout.js'

// Like the archive: three events a year, one of each size, ids in a fixed
// size order within every year.
const years = Array.from({ length: 50 }, (_, i) => {
  const id = 100 + i * 3
  return [
    { id, significance: 5 },
    { id: id + 1, significance: 3 },
    { id: id + 2, significance: 1 },
  ]
})

test('pickEvents gives the same order on every call', () => {
  for (const events of years) {
    assert.deepEqual(pickEvents(events), pickEvents([...events].reverse()))
  }
})

test("the big patch doesn't sit in the same place every year", () => {
  const bigAt = years.map((events) => pickEvents(events).findIndex((e) => e.significance === 5))
  for (const position of [0, 1, 2]) {
    assert.ok(bigAt.includes(position), `big patch never at position ${position}`)
  }
})

test('pickEvents still keeps one of each size, at most four', () => {
  const events = [5, 5, 4, 3, 3, 2, 1, 1].map((significance, id) => ({ id, significance }))
  const picked = pickEvents(events)
  assert.equal(picked.length, 4)
  assert.deepEqual(
    picked.map((e) => e.significance).sort(),
    [2, 3, 4, 5],
  )
})

test('nudges stay within their limits and vary between patches', () => {
  const offsets = Array.from({ length: 200 }, (_, seed) => patchOffset(seed, 1.5))
  for (const { x, y, rotate } of offsets) {
    assert.ok(Math.abs(x) <= MAX_SHIFT_X)
    assert.ok(Math.abs(y) <= MAX_SHIFT_Y)
    assert.ok(Math.abs(rotate) <= 1.5)
  }
  // Some patches move by more than half the limit, so the grid visibly breaks.
  assert.ok(offsets.some(({ x }) => Math.abs(x) > MAX_SHIFT_X / 2))
  assert.deepEqual(patchOffset(7, 1.5), patchOffset(7, 1.5))
})

test('patchStyle spans the grid and nudges in cell units', () => {
  const style = patchStyle([3, 2], 7, 1.5)
  assert.equal(style.gridColumn, 'span 3')
  assert.equal(style.gridRow, 'span 2')
  assert.match(style.transform, /^translate\(calc\(var\(--cell\) \* -?[\d.e-]+\), calc\(var\(--cell\) \* -?[\d.e-]+\)\) rotate\(-?[\d.e-]+deg\)$/)
})
