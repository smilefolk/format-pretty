import assert from 'node:assert/strict'
import {
  diffJson,
  diffJsonWithMeta,
  summarize,
  toReport,
  typeLabel,
  countKeys,
} from '../../.lib-tmp/diff.js'

const L = JSON.parse(
  `{"id":1024,"name":"Somchai","active":true,"score":87,"roles":["admin","editor"],"profile":{"city":"Bangkok","zip":"10110"},"legacyField":"ยังอยู่ในก้อนซ้าย"}`
)
const R = JSON.parse(
  `{"id":"1024","name":"Somchai","active":false,"score":87,"roles":["admin","viewer","billing"],"profile":{"city":"Chiang Mai","zip":"10110"},"newField":"เพิ่มเข้ามาในก้อนขวา"}`
)
const paths = (ds) => ds.map((d) => `${d.type} ${d.path}`)
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

t('default unchanged: sample → 6 diffs in the original order, kinds on type row', () => {
  const ds = diffJson(L, R)
  assert.deepEqual(paths(ds), [
    'type $.id',
    'changed $.active',
    'changed $.roles[1]',
    'added $.roles[2]',
    'changed $.profile.city',
    'removed $.legacyField',
    'added $.newField',
  ])
  assert.equal(ds.length, 7)
  assert.deepEqual(ds[0].kinds, ['number', 'string'])
  assert.ok(!ds.some((d) => d.type === 'equal'))
})
t('1. index vs key: swapped order → index reports 4 changed, key reports 0', () => {
  const a = {
    items: [
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
    ],
  }
  const b = {
    items: [
      { id: 2, v: 'b' },
      { id: 1, v: 'a' },
    ],
  }
  assert.equal(diffJson(a, b).length, 4)
  assert.equal(diffJson(a, b, { arrayKey: 'id' }).length, 0)
})
t('2. key missing in one item → fallback to index for that array + reported', () => {
  const a = { items: [{ id: 1, v: 'a' }, { v: 'b' }] }
  const b = { items: [{ v: 'b' }, { id: 1, v: 'a' }] }
  const { diffs, fallbacks } = diffJsonWithMeta(a, b, { arrayKey: 'id' })
  assert.deepEqual(fallbacks, ['$.items'])
  assert.deepEqual(paths(diffs), [
    'removed $.items[0].id',
    'changed $.items[0].v',
    'changed $.items[1].v',
    'added $.items[1].id',
  ])
})
t('3. duplicate key values → fallback', () => {
  const a = { items: [{ id: 1 }, { id: 1 }] }
  const b = { items: [{ id: 1 }, { id: 1 }] }
  const { diffs, fallbacks } = diffJsonWithMeta(a, b, { arrayKey: 'id' })
  assert.deepEqual(fallbacks, ['$.items'])
  assert.equal(diffs.length, 0)
})
t('4. key mode: same data, different order + nested arrays → 0 diffs', () => {
  const a = { items: [{ id: 7, tags: [{ id: 'x' }, { id: 'y' }] }, { id: 8 }] }
  const b = { items: [{ id: 8 }, { id: 7, tags: [{ id: 'y' }, { id: 'x' }] }] }
  assert.deepEqual(diffJsonWithMeta(a, b, { arrayKey: 'id' }), { diffs: [], fallbacks: [] })
})
t(
  'D6 paths: number key [id=7], string key [sku="X1"], nested change path, added/removed by key',
  () => {
    const a = {
      items: [
        { id: 7, qty: 2 },
        { id: 8, qty: 1 },
      ],
      skus: [{ sku: 'X1', n: 1 }],
    }
    const b = {
      items: [
        { id: 7, qty: 3 },
        { id: 9, qty: 1 },
      ],
      skus: [
        { sku: 'X1', n: 1 },
        { sku: 'Y7', n: 2 },
      ],
    }
    const ds = diffJson(a, b, { arrayKey: 'id' })
    // skus มี sku ไม่มี id → fallback index เฉพาะอาร์เรย์นั้น
    assert.deepEqual(paths(ds), [
      'changed $.items[id=7].qty',
      'removed $.items[id=8]',
      'added $.items[id=9]',
      'added $.skus[1]',
    ])
    assert.deepEqual(ds[1].left, { id: 8, qty: 1 })
    assert.deepEqual(ds[2].right, { id: 9, qty: 1 })
    const ds2 = diffJson(a, b, { arrayKey: 'sku' })
    assert.ok(paths(ds2).includes('added $.skus[sku="Y7"]'))
    // "7" vs 7 are different keys
    const c = diffJson({ x: [{ id: 7 }] }, { x: [{ id: '7' }] }, { arrayKey: 'id' })
    assert.deepEqual(paths(c), ['removed $.x[id=7]', 'added $.x[id="7"]'])
  }
)
t(
  'key mode: primitive arrays compare by index without a fallback report; arrays containing objects report',
  () => {
    const { diffs, fallbacks } = diffJsonWithMeta(L, R, { arrayKey: 'id' })
    assert.deepEqual(fallbacks, [])
    assert.equal(diffs.length, 7)
    const mixed = diffJsonWithMeta(
      { a: [{ id: 1 }, 'x'] },
      { a: [{ id: 1 }, 'x'] },
      { arrayKey: 'id' }
    )
    assert.deepEqual(mixed.fallbacks, ['$.a'])
    // sibling keyed array still keyed while another falls back
    const m = diffJsonWithMeta(
      { ok: [{ id: 1 }, { id: 2 }], bad: [{ id: 1 }, { id: 1 }] },
      { ok: [{ id: 2 }, { id: 1 }], bad: [{ id: 1 }, { id: 1 }] },
      { arrayKey: 'id' }
    )
    assert.deepEqual(m, { diffs: [], fallbacks: ['$.bad'] })
  }
)
t('5. includeEqual → leaf equal rows; summarize / toReport ignore them', () => {
  const ds = diffJson(L, R, { includeEqual: true })
  const eq = ds.filter((d) => d.type === 'equal')
  assert.deepEqual(
    eq.map((d) => d.path),
    ['$.name', '$.score', '$.roles[0]', '$.profile.zip']
  )
  assert.deepEqual(eq[0], { path: '$.name', type: 'equal', left: 'Somchai', right: 'Somchai' })
  assert.equal(ds.length, 7 + 4)
  assert.deepEqual(summarize(ds), { added: 2, removed: 1, changed: 3, type: 1 })
  assert.ok(!toReport(ds).includes('$.name'))
  assert.equal(toReport(ds), toReport(diffJson(L, R)))
  // equal rows keep document order relative to diffs
  assert.deepEqual(paths(ds).slice(0, 3), ['type $.id', 'equal $.name', 'changed $.active'])
  // empty containers are not leaves
  assert.deepEqual(diffJson({ a: {}, b: [] }, { a: {}, b: [] }, { includeEqual: true }), [])
})
t('6. countKeys on the sample → matched 4 / total 11 (union of leaf paths)', () => {
  assert.deepEqual(countKeys(L, R), { matched: 4, total: 11 })
  assert.deepEqual(countKeys({ a: 1 }, { a: 1 }), { matched: 1, total: 1 })
  assert.deepEqual(countKeys({}, {}), { matched: 0, total: 0 })
  // type mismatch leaf vs container: $.x (right) + $.x.a, $.x.b (left) = 3 paths
  assert.deepEqual(countKeys({ x: { a: 1, b: 2 } }, { x: 'str' }), { matched: 0, total: 3 })
  // key strategy counts matched pairs across reordered arrays
  const a = {
      items: [
        { id: 1, v: 'a' },
        { id: 2, v: 'b' },
      ],
    },
    b = {
      items: [
        { id: 2, v: 'b' },
        { id: 1, v: 'a' },
      ],
    }
  assert.deepEqual(countKeys(a, b), { matched: 0, total: 4 })
  assert.deepEqual(countKeys(a, b, { arrayKey: 'id' }), { matched: 4, total: 4 })
})
t('labels: short design wording; report still lists side values', () => {
  assert.deepEqual(['changed', 'type', 'removed', 'added', 'equal'].map(typeLabel), [
    'ค่าต่างกัน',
    'ชนิดต่างกัน',
    'เฉพาะซ้าย',
    'เฉพาะขวา',
    'เหมือนกัน',
  ])
  const r = toReport(diffJson(L, R))
  assert.ok(r.includes('$.legacyField  [เฉพาะซ้าย]\n  ซ้าย: "ยังอยู่ในก้อนซ้าย"'))
  assert.ok(r.includes('$.newField  [เฉพาะขวา]\n  ขวา: "เพิ่มเข้ามาในก้อนขวา"'))
  assert.equal(toReport([]), 'ข้อมูลสองก้อนเหมือนกันทุกประการ')
})
console.log(`diff.js: ${n} cases passed`)
