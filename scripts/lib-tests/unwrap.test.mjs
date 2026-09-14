import assert from 'node:assert/strict'
import { unwrapJson, unwrapNested } from '../../.lib-tmp/unwrap.js'
import { childPath } from '../../.lib-tmp/path.js'

const SAMPLE = `"{\\"order_id\\":\\"A-1024\\",\\"items\\":[{\\"sku\\":\\"X1\\",\\"qty\\":2},{\\"sku\\":\\"Y7\\",\\"qty\\":1}],\\"paid\\":true,\\"note\\":null}"`
const SAMPLE_NESTED = `{"event":"order.created","ts":"2026-09-02T10:20:30Z","payload":"{\\"order_id\\":\\"A-1024\\",\\"customer\\":\\"{\\\\\\"id\\\\\\":7,\\\\\\"tier\\\\\\":\\\\\\"gold\\\\\\"}\\"}"}`
let n = 0
const t = (name, fn) => {
  try {
    fn()
    n++
  } catch (e) {
    console.error('FAIL:', name)
    throw e
  }
}

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
t('1. SAMPLE_NESTED → fields payload, payload.customer; count 2; passes 1', () => {
  const outer = unwrapJson(SAMPLE_NESTED)
  assert.equal(outer.layers, 0)
  const r = unwrapNested(outer.value)
  assert.deepEqual(r.fields, [
    { path: 'payload', depth: 1 },
    { path: 'payload.customer', depth: 2 },
  ])
  assert.equal(r.count, 2)
  assert.equal(r.passes, 1)
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
t(
  '3. fields escaped to different depths: repeat:false leaves a string, repeat:true unwraps with passes ≥ 2',
  () => {
    const inner = JSON.stringify({ a: 1 }) // {"a":1}
    const doubled = JSON.stringify(inner) // "{\"a\":1}"  (a JSON string whose content is JSON)
    const value = {
      once: inner,
      twice: doubled,
      plain: 'hello',
      quoted: JSON.stringify('hello'),
      num: '42',
    }
    const one = unwrapNested(value)
    assert.deepEqual(one.value.once, { a: 1 })
    assert.equal(typeof one.value.twice, 'string') // ยังค้างเป็นสตริง
    assert.equal(one.passes, 1)
    const all = unwrapNested(value, { repeat: true })
    assert.deepEqual(all.value.twice, { a: 1 })
    assert.ok(all.passes >= 2, `passes ${all.passes}`)
    assert.deepEqual(all.fields.map((f) => f.path).sort(), ['once', 'twice'])
    assert.equal(all.count, 2)
    // ค่าที่ไม่ใช่ JSON ต้องไม่ถูกแตะ
    assert.equal(all.value.plain, 'hello')
    assert.equal(all.value.quoted, '"hello"')
    assert.equal(all.value.num, '42')
    assert.equal(one.value.quoted, '"hello"')
  }
)
t('4. pathological: 20 string layers stops at passes 8', () => {
  let s = '{"a":1}'
  for (let i = 0; i < 20; i++) s = JSON.stringify(s)
  const r = unwrapNested({ deep: s }, { repeat: true })
  assert.equal(r.passes, 8)
  assert.equal(typeof r.value.deep, 'string')
})
t('repeat with nothing to do → passes 1; already JSON → no fields', () => {
  const r = unwrapNested({ a: 1, b: 'x' }, { repeat: true })
  assert.deepEqual(r, { value: { a: 1, b: 'x' }, count: 0, fields: [], passes: 1 })
})
console.log(`unwrap.js: ${n} cases passed`)
