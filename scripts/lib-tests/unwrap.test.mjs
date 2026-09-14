import assert from 'node:assert/strict'
import { suite } from './_harness.mjs'
import { unwrapJson, unwrapNested } from '../../src/lib/unwrap.js'
import { childPath } from '../../src/lib/path.js'

const { t, done } = suite('unwrap.js')

const SAMPLE = `"{\\"order_id\\":\\"A-1024\\",\\"items\\":[{\\"sku\\":\\"X1\\",\\"qty\\":2},{\\"sku\\":\\"Y7\\",\\"qty\\":1}],\\"paid\\":true,\\"note\\":null}"`
const SAMPLE_NESTED = `{"event":"order.created","ts":"2026-09-02T10:20:30Z","payload":"{\\"order_id\\":\\"A-1024\\",\\"customer\\":\\"{\\\\\\"id\\\\\\":7,\\\\\\"tier\\\\\\":\\\\\\"gold\\\\\\"}\\"}"}`

t('path.js: childPath root $ (diff) and relative root (unwrap)', () => {
  assert.equal(childPath('$', 'a'), '$.a')
  assert.equal(childPath('$', 0), '$[0]')
  assert.equal(childPath('$', 'k y'), '$["k y"]')
  assert.equal(childPath('', 'payload'), 'payload')
  assert.equal(childPath('payload', 'customer'), 'payload.customer')
  assert.equal(childPath('', 0), '[0]')
  assert.equal(childPath('items[0]', 'meta'), 'items[0].meta')
  assert.equal(childPath('', 'k y'), '["k y"]')
})
t('5. unwrapJson backward compatible: ok/value/layers/merged + peels', () => {
  const r = unwrapJson(SAMPLE)
  assert.equal(r.ok, true)
  assert.equal(r.layers, 1)
  assert.equal(r.merged, 0)
  assert.equal(r.value.order_id, 'A-1024')
  assert.deepEqual(r.peels, [{ n: 1, where: 'string' }])
  const raw = unwrapJson('{"a":1}')
  assert.deepEqual(raw, { ok: true, value: { a: 1 }, layers: 0, merged: 0, peels: [] })
  const two = unwrapJson(JSON.stringify(JSON.stringify('{"a":1}')))
  assert.equal(two.layers, 2)
  assert.deepEqual(
    two.peels.map((p) => p.n),
    [1, 2]
  )
  const empty = unwrapJson('  ')
  assert.equal(empty.empty, true)
  assert.equal(empty.layers, 0)
  assert.deepEqual(empty.peels, [])
  const bad = unwrapJson('"{\\"a\\":"')
  assert.equal(bad.ok, false)
  assert.equal(bad.layers, 1)
  assert.equal(bad.peeled, '{"a":')
  assert.ok(bad.error.message)
  assert.deepEqual(bad.peels, [{ n: 1, where: 'string' }])
})
t('2. SAMPLE (quoted) → peels 1 layer where string', () => {
  assert.deepEqual(unwrapJson(SAMPLE).peels, [{ n: 1, where: 'string' }])
})
t('1. SAMPLE_NESTED → fields payload, payload.customer; count 2', () => {
  const outer = unwrapJson(SAMPLE_NESTED)
  assert.equal(outer.layers, 0)
  const r = unwrapNested(outer.value)
  assert.deepEqual(r.fields, [
    { path: 'payload', depth: 1 },
    { path: 'payload.customer', depth: 2 },
  ])
  assert.equal(r.count, 2)
  assert.deepEqual(r.value.payload.customer, { id: 7, tier: 'gold' })
})
t('field paths through arrays + non-ident keys', () => {
  const r = unwrapNested({ items: [{ meta: '{"x":1}' }], 'k y': '[1,2]' })
  assert.deepEqual(
    r.fields.map((f) => f.path),
    ['items[0].meta', '["k y"]']
  )
  assert.deepEqual(r.value, { items: [{ meta: { x: 1 } }], 'k y': [1, 2] })
})
t('3. ฟิลด์ที่ escape ต่างระดับกันแกะครบในรอบเดียว (#56 — ไม่มี toggle แกะซ้ำแล้ว)', () => {
  const inner = JSON.stringify({ a: 1 }) // {"a":1}
  const doubled = JSON.stringify(inner) // "{\"a\":1}" (สตริง JSON ที่ข้างในเป็น JSON อีกชั้น)
  const tripled = JSON.stringify(doubled)
  const value = {
    once: inner,
    twice: doubled,
    thrice: tripled,
    plain: 'hello',
    quoted: JSON.stringify('hello'),
    num: '42',
    nestedTwice: JSON.stringify({ inner: doubled }),
  }
  const r = unwrapNested(value)
  assert.deepEqual(r.value.once, { a: 1 })
  assert.deepEqual(r.value.twice, { a: 1 })
  assert.deepEqual(r.value.thrice, { a: 1 })
  assert.deepEqual(r.value.nestedTwice, { inner: { a: 1 } })
  assert.deepEqual(
    r.fields.map((f) => f.path),
    ['once', 'twice', 'thrice', 'nestedTwice', 'nestedTwice.inner']
  )
  assert.deepEqual(
    r.fields.map((f) => f.depth),
    [1, 1, 1, 1, 2]
  )
  assert.equal(r.count, 5)
  // ค่าที่ไม่ใช่ JSON ต้องไม่ถูกแตะ
  assert.equal(r.value.plain, 'hello')
  assert.equal(r.value.quoted, '"hello"')
  assert.equal(r.value.num, '42')
})
t('4. เคสเทียม: สตริง escape ซ้อน 20 ชั้น หยุดที่ 8 และคืนค่าเดิมทั้งก้อน (ไม่ทำลายข้อมูล)', () => {
  let s = '{"a":1}'
  for (let i = 0; i < 20; i++) s = JSON.stringify(s)
  const r = unwrapNested({ deep: s })
  assert.equal(r.value.deep, s)
  assert.deepEqual(r.fields, [])
  // 8 ชั้นพอดียังแกะได้
  let ok = '{"a":1}'
  for (let i = 0; i < 8; i++) ok = JSON.stringify(ok)
  assert.deepEqual(unwrapNested({ deep: ok }).value.deep, { a: 1 })
})
t('JSON อยู่แล้ว → ไม่มี fields', () => {
  assert.deepEqual(unwrapNested({ a: 1, b: 'x' }), {
    value: { a: 1, b: 'x' },
    count: 0,
    fields: [],
  })
})
done()
