import assert from 'node:assert/strict'
import { suite } from './_harness.mjs'
import { lineEndingOf, parseJson, withLineEnding } from '../../src/lib/json.js'

const { t, done } = suite('json.js')

const ND = '{"id":1}\n{"id":2}\n{"id":3}'

t('NDJSON merge on (default) → array 3 / merged 3', () => {
  const r = parseJson(ND)
  assert.equal(r.ok, true)
  assert.equal(r.merged, 3)
  assert.deepEqual(r.value, [{ id: 1 }, { id: 2 }, { id: 3 }])
})
t('NDJSON merge:true explicit → same', () => {
  assert.deepEqual(parseJson(ND, { merge: true }), parseJson(ND))
})
t('NDJSON merge off → error line 2 column 1', () => {
  const r = parseJson(ND, { merge: false })
  assert.equal(r.ok, false)
  assert.equal(r.empty, undefined)
  assert.equal(r.error.line, 2)
  assert.equal(r.error.column, 1)
  assert.match(r.error.message, /มากกว่าหนึ่งก้อน/)
})
t('merge off, 2nd chunk after spaces on same line → column points at chunk start', () => {
  const r = parseJson('{"a":1}   {"b":2}', { merge: false })
  assert.equal(r.error.line, 1)
  assert.equal(r.error.column, 11)
})
t('single valid doc → identical in both modes (fast path)', () => {
  for (const text of ['{"a":1}', '[1,2]', ' "s" ', '42', 'null']) {
    const on = parseJson(text),
      off = parseJson(text, { merge: false })
    assert.deepEqual(on, off)
    assert.equal(on.ok, true)
    assert.equal(on.merged, 0)
  }
})
t('empty → empty in both modes', () => {
  assert.equal(parseJson('  \n', { merge: false }).empty, true)
  assert.equal(parseJson('').empty, true)
})
t('real syntax error → same error in both modes (merge off must not mask it)', () => {
  const on = parseJson('{"a":1,}'),
    off = parseJson('{"a":1,}', { merge: false })
  assert.deepEqual(on, off)
  assert.equal(on.ok, false)
  assert.equal(on.error.line, 1)
})
t('two chunks where 2nd is broken → real error wins over "more than one" (both modes)', () => {
  const on = parseJson('{"a":1}\n{"b":'),
    off = parseJson('{"a":1}\n{"b":', { merge: false })
  assert.deepEqual(on, off)
  assert.equal(on.ok, false)
  assert.equal(on.error.line, 2)
})
t('unknown option object → default merge', () => {
  assert.equal(parseJson(ND, {}).ok, true)
  assert.equal(parseJson(ND, undefined).ok, true)
})
t('lineEndingOf / withLineEnding', () => {
  assert.equal(lineEndingOf('a\r\nb'), 'crlf')
  assert.equal(lineEndingOf('a\nb'), 'lf')
  assert.equal(lineEndingOf(''), 'lf')
  assert.equal(withLineEnding('a\nb\n', 'crlf'), 'a\r\nb\r\n')
  assert.equal(withLineEnding('a\r\nb', 'crlf'), 'a\r\nb') // ไม่ซ้อน \r
  assert.equal(withLineEnding('a\nb', 'lf'), 'a\nb')
})
done()
