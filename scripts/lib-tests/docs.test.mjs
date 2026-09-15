import assert from 'node:assert/strict'
import { suite } from './_harness.mjs'

const { t, done } = suite('docs.js')
import {
  CONTENT_LIMIT,
  activeDoc,
  createDoc,
  deserializeDocs,
  docsReducer,
  initialDocsState,
  isBlankDoc,
  isDefaultName,
  latestDocForTool,
  nextDocName,
  serializeDocs,
  uniqueName,
} from '../../src/lib/docs.js'

const r = docsReducer

t('initial state: one blank doc of the tool, active, recent', () => {
  const s = initialDocsState('format')
  assert.equal(s.docs.length, 1)
  assert.equal(s.docs[0].tool, 'format')
  assert.equal(s.activeId, s.docs[0].id)
  assert.deepEqual(s.recent, [s.docs[0].id])
  assert.equal(s.docs[0].name, 'เอกสาร 1')
  assert.equal(s.docs[0].indent, '2')
  assert.equal(s.docs[0].sortKeys, false)
  assert.equal(s.docs[0].mergeChunks, true)
  assert.equal(s.docs[0].lineEnding, 'lf')
})
t('names: smallest unused number; unknown tool throws', () => {
  assert.equal(nextDocName([{ name: 'เอกสาร 1' }, { name: 'เอกสาร 3' }]), 'เอกสาร 2')
  assert.throws(() => createDoc('nope'))
})
t('open / activate / update / rename / close', () => {
  let s = initialDocsState('format')
  const d2 = createDoc('compare', { left: 'x' }, s.docs)
  s = r(s, { type: 'open', doc: d2 })
  assert.equal(s.activeId, d2.id)
  assert.equal(s.docs.length, 2)
  assert.equal(d2.name, 'เอกสาร 2')
  assert.equal(d2.left, 'x')
  s = r(s, { type: 'update', id: d2.id, patch: { strategy: 'key', arrayKey: 'sku' } })
  assert.equal(activeDoc(s).strategy, 'key')
  assert.equal(activeDoc(s).arrayKey, 'sku')
  s = r(s, { type: 'rename', id: d2.id, name: '  orders  ' })
  assert.equal(activeDoc(s).name, 'orders')
  assert.equal(r(s, { type: 'rename', id: d2.id, name: '  ' }), s)
  const first = s.docs[0].id
  s = r(s, { type: 'activate', id: first })
  assert.equal(s.activeId, first)
  assert.equal(s.recent[0], first)
  assert.equal(r(s, { type: 'activate', id: 'missing' }), s)
  // ปิดอันที่ไม่ active → active คงเดิม
  s = r(s, { type: 'close', id: d2.id })
  assert.equal(s.activeId, first)
  assert.equal(s.docs.length, 1)
  // ปิดอันสุดท้าย → doc เปล่าของ tool เดิม
  s = r(s, { type: 'close', id: first })
  assert.equal(s.docs.length, 1)
  assert.equal(s.docs[0].tool, 'format')
  assert.notEqual(s.docs[0].id, first)
})
t('close active → next to the right, else left', () => {
  let s = initialDocsState('format')
  const b = createDoc('format', {}, s.docs),
    c = createDoc('format', {}, [...s.docs, b])
  s = r(r(s, { type: 'open', doc: b }), { type: 'open', doc: c })
  s = r(s, { type: 'activate', id: b.id })
  s = r(s, { type: 'close', id: b.id })
  assert.equal(s.activeId, c.id)
  s = r(s, { type: 'close', id: c.id })
  assert.equal(s.activeId, s.docs[0].id)
})
t('ชื่อ default / ชื่อไม่ซ้ำตอน rename (เปิดไฟล์ชื่อเดียวกันสองครั้ง → orders.json (2))', () => {
  assert.equal(isDefaultName('เอกสาร 1'), true)
  assert.equal(isDefaultName('เอกสาร 12'), true)
  assert.equal(isDefaultName('orders.json'), false)
  assert.equal(isDefaultName('เอกสาร x'), false)
  let s = initialDocsState('format')
  const b = createDoc('format', {}, s.docs)
  s = r(s, { type: 'open', doc: b })
  s = r(s, { type: 'rename', id: s.docs[0].id, name: 'orders.json' })
  s = r(s, { type: 'rename', id: b.id, name: 'orders.json' })
  assert.deepEqual(
    s.docs.map((d) => d.name),
    ['orders.json', 'orders.json (2)']
  )
  // rename เป็นชื่อเดิมของตัวเองไม่ต่อท้าย
  s = r(s, { type: 'rename', id: b.id, name: 'orders.json (2)' })
  assert.equal(s.docs[1].name, 'orders.json (2)')
  assert.equal(uniqueName(s.docs, 'orders.json'), 'orders.json (3)')
})
t('latestDocForTool follows MRU', () => {
  let s = initialDocsState('format')
  const u1 = createDoc('unwrap', {}, s.docs),
    u2 = createDoc('unwrap', {}, [...s.docs, u1])
  s = r(r(s, { type: 'open', doc: u1 }), { type: 'open', doc: u2 })
  s = r(s, { type: 'activate', id: u1.id })
  assert.equal(latestDocForTool(s, 'unwrap').id, u1.id)
  assert.equal(latestDocForTool(s, 'compare'), null)
})
t('serialize / deserialize round-trip; tooLarge keeps metadata only; bad input → null', () => {
  let s = initialDocsState('format')
  s = r(s, { type: 'update', id: s.docs[0].id, patch: { input: '{"a":1}', indent: '4' } })
  const big = createDoc('unwrap', { input: 'x'.repeat(CONTENT_LIMIT + 1) }, s.docs)
  s = r(s, { type: 'open', doc: big })
  const json = serializeDocs(s)
  const parsed = JSON.parse(json)
  assert.equal(parsed.version, 1)
  assert.equal(parsed.activeDocId, big.id)
  assert.equal(parsed.docs[1].tooLarge, true)
  assert.equal(parsed.docs[1].input, '')
  assert.equal(parsed.docs[0].indent, '4')
  const back = deserializeDocs(json)
  assert.equal(back.activeId, big.id)
  assert.equal(back.docs[0].input, '{"a":1}')
  assert.equal(back.docs[1].tool, 'unwrap')
  assert.equal(deserializeDocs('not json'), null)
  // doc เก่าที่ยังไม่มีธง lineEnding → default 'lf'
  const legacy = JSON.stringify({
    version: 1,
    activeDocId: 'x',
    docs: [{ id: 'x', tool: 'format', name: 'เอกสาร 1' }],
  })
  assert.equal(deserializeDocs(legacy).docs[0].lineEnding, 'lf')
  assert.equal(deserializeDocs('{"version":99}'), null)
  // ธง tooLarge ไม่ค้าง: เนื้อหาเล็กลงแล้ว serialize ใหม่ต้องเก็บจริง
  const shrunk = r(back, { type: 'update', id: big.id, patch: { input: 'small' } })
  assert.equal(JSON.parse(serializeDocs(shrunk)).docs[1].input, 'small')
})
t('isBlankDoc: ไม่มีเนื้อหา + ชื่อยังเป็น default (ตัวเลือกเปลี่ยนก็ยังเปล่า)', () => {
  const d = initialDocsState('format').docs[0]
  assert.equal(isBlankDoc(d), true)
  assert.equal(isBlankDoc({ ...d, indent: '4' }), true)
  assert.equal(isBlankDoc({ ...d, input: '{}' }), false)
  assert.equal(isBlankDoc({ ...d, left: 'x' }), false)
  assert.equal(isBlankDoc({ ...d, right: 'x' }), false)
  assert.equal(isBlankDoc({ ...d, name: 'orders.json' }), false)
  // เนื้อหาไม่ได้ถูกบันทึกเพราะใหญ่เกิน — ไม่ใช่ doc เปล่า
  assert.equal(isBlankDoc({ ...d, tooLarge: true }), false)
})
t('openTool: doc เปล่าที่ active เปลี่ยนเครื่องมือแทนการเด้งไป doc เดิม (#67)', () => {
  let s = initialDocsState('format')
  const c = createDoc('compare', { left: '1' }, s.docs)
  s = r(s, { type: 'open', doc: c })
  s = r(s, { type: 'activate', id: s.docs[0].id })
  // กด + → เอกสาร 3 (format เปล่า) แล้วผู้ใช้ปรับตัวเลือกไปบ้าง
  const blank = createDoc('format', {}, s.docs)
  s = r(s, { type: 'open', doc: blank })
  s = r(s, { type: 'update', id: blank.id, patch: { indent: '4' } })
  s = r(s, { type: 'openTool', tool: 'compare' })
  assert.equal(s.activeId, blank.id)
  assert.equal(s.docs.length, 3)
  const d = activeDoc(s)
  assert.equal(d.tool, 'compare')
  assert.equal(d.name, 'เอกสาร 3')
  assert.equal(d.indent, '2')
  assert.equal(s.docs.indexOf(d), 2)
  assert.equal(s.recent[0], blank.id)
  // เครื่องมือเดิม / เครื่องมือที่ไม่รู้จัก → ไม่เปลี่ยนอะไร (ไม่ reset ตัวเลือก)
  s = r(s, { type: 'update', id: blank.id, patch: { strategy: 'key' } })
  assert.equal(r(s, { type: 'openTool', tool: 'compare' }), s)
  assert.equal(r(s, { type: 'openTool', tool: 'nope' }), s)
})
t('openTool: doc เปล่าที่ rail สร้างให้เอง → เปลี่ยนใจกลับเครื่องมือเดิมได้ doc เดิม ไม่ใช่ tab เปล่า', () => {
  let s = initialDocsState('format')
  const f1 = s.docs[0].id
  s = r(s, { type: 'update', id: f1, patch: { input: '{}' } })
  s = r(s, { type: 'openTool', tool: 'compare' })
  assert.equal(s.docs.length, 2)
  assert.equal(activeDoc(s).tool, 'compare')
  assert.equal(activeDoc(s).name, 'เอกสาร 2')
  const c = s.activeId
  // c เปล่าแต่เป็น doc เดียวของ compare (ไม่ได้มาจากกด +) และ format มี f1 อยู่ → กลับไป f1
  s = r(s, { type: 'openTool', tool: 'format' })
  assert.equal(s.activeId, f1)
  assert.equal(s.docs.length, 2)
  assert.equal(s.docs[1].tool, 'compare')
  // กลับไป DIFF → c ตาม MRU ไม่สร้างเพิ่ม
  s = r(s, { type: 'openTool', tool: 'compare' })
  assert.equal(s.activeId, c)
  // จาก c (ยังเปล่า) ไป UNWRAP ที่ยังไม่มี doc → c เปลี่ยนเป็น unwrap แทนการสร้างเพิ่ม
  s = r(s, { type: 'openTool', tool: 'unwrap' })
  assert.equal(s.activeId, c)
  assert.equal(activeDoc(s).tool, 'unwrap')
  assert.equal(s.docs.length, 2)
})
t('openTool: tab เดียวที่ยังเปล่าเปลี่ยนเครื่องมือตามที่คลิก ไม่สร้าง tab เพิ่ม', () => {
  let s = initialDocsState('format')
  const id = s.docs[0].id
  s = r(s, { type: 'openTool', tool: 'compare' })
  assert.equal(s.docs.length, 1)
  assert.equal(activeDoc(s).id, id)
  assert.equal(activeDoc(s).tool, 'compare')
  s = r(s, { type: 'openTool', tool: 'format' })
  assert.equal(s.docs.length, 1)
  assert.equal(activeDoc(s).tool, 'format')
})
done()
