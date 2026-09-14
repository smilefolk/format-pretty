import assert from 'node:assert/strict'
import { suite } from './_harness.mjs'
import {
  GROUPS,
  ON,
  RECENT_LIMIT,
  listCommands,
  rankCommands,
  readRecent,
  recordRecent,
  searchCommands,
} from '../../src/lib/commands.js'

const { t, done } = suite('commands.js')

const spy = () => {
  const f = (...a) => {
    f.calls.push(a)
  }
  f.calls = []
  return f
}
const mkCtx = (doc, extra = {}) => {
  const ctx = {
    doc: {
      id: 'd1',
      name: 'เอกสาร 1',
      tool: 'format',
      indent: '2',
      sortKeys: false,
      mergeChunks: true,
      view: 'code',
      strategy: 'index',
      arrayKey: 'id',
      showEqual: false,
      deep: true,
      repeat: false,
      ...doc,
    },
    docs: [],
    actions: {},
    set: spy(),
    openTool: spy(),
    newDoc: spy(),
    closeDoc: spy(),
    activateDoc: spy(),
    toggleTheme: spy(),
    setLang: spy(),
    theme: 'dark',
    lang: 'th',
    ...extra,
  }
  ctx.docs = ctx.docs.length ? ctx.docs : [ctx.doc]
  return ctx
}
const ids = (cmds) => cmds.map((c) => c.id)

t('format tool, 2 docs, fix available → ~24 commands; groups all known', () => {
  const ctx = mkCtx(
    {},
    {
      docs: [
        { id: 'd1', name: 'เอกสาร 1', tool: 'format' },
        { id: 'd2', name: 'เอกสาร 2', tool: 'compare' },
      ],
      actions: { fix: () => {} },
    }
  )
  const cmds = listCommands(ctx)
  assert.ok(cmds.length >= 24, `got ${cmds.length}`)
  assert.ok(cmds.every((c) => GROUPS.some((g) => g.id === c.group)))
  assert.ok(ids(cmds).includes('fix'))
  assert.ok(ids(cmds).includes('doc:d2'))
  assert.ok(!ids(cmds).includes('doc:d1'))
  assert.ok(!ids(cmds).includes('swap'))
  assert.ok(!ids(cmds).includes('deep'))
  console.log('   commands (format, 2 docs, fix):', cmds.length)
})
t('fix hidden when actions.fix is null', () => {
  assert.ok(!ids(listCommands(mkCtx({}, { actions: { fix: null } }))).includes('fix'))
})
t('when: compare shows swap/copy-report/strategy/show-equal, hides format-only', () => {
  const c = ids(listCommands(mkCtx({ tool: 'compare' })))
  for (const id of [
    'swap',
    'copy-report',
    'strategy-index',
    'strategy-key',
    'show-equal',
    'sample',
    'clear',
    'new-doc',
    'open-file-left',
    'open-file-right',
  ])
    assert.ok(c.includes(id), id)
  for (const id of [
    'format',
    'minify',
    'indent-2',
    'sort-keys',
    'view-code',
    'copy',
    'deep',
    'open-file',
  ])
    assert.ok(!c.includes(id), id)
})
t('when: unwrap shows unwrap/send/deep/repeat/indent/view/samples', () => {
  const c = ids(listCommands(mkCtx({ tool: 'unwrap' })))
  for (const id of [
    'unwrap',
    'send-to-formatter',
    'deep',
    'repeat',
    'indent-tab',
    'view-tree',
    'sample-unwrap',
    'sample-nested',
    'copy',
    'download',
    'open-file',
  ])
    assert.ok(c.includes(id), id)
  for (const id of [
    'format',
    'sort-keys',
    'merge-chunks',
    'swap',
    'sample-multi',
    'open-file-left',
  ])
    assert.ok(!c.includes(id), id)
})
t('state: เปิดอยู่ for current indent/view/toggles/tool/theme/lang', () => {
  const ctx = mkCtx(
    { indent: '4', sortKeys: true, mergeChunks: false, view: 'tree' },
    { theme: 'light', lang: 'en' }
  )
  const byId = Object.fromEntries(listCommands(ctx).map((c) => [c.id, c]))
  assert.equal(byId['indent-4'].state(ctx), ON)
  assert.equal(byId['indent-2'].state(ctx), null)
  assert.equal(byId['sort-keys'].state(ctx), ON)
  assert.equal(byId['merge-chunks'].state(ctx), null)
  assert.equal(byId['view-tree'].state(ctx), ON)
  assert.equal(byId['view-code'].state(ctx), null)
  assert.equal(byId['tool-format'].state(ctx), ON)
  assert.equal(byId['tool-compare'].state(ctx), null)
  assert.equal(byId['theme'].state(ctx), ON)
  assert.equal(byId['lang'].state(ctx), ON)
  const u = mkCtx({ tool: 'unwrap', deep: false, repeat: true })
  const ub = Object.fromEntries(listCommands(u).map((c) => [c.id, c]))
  assert.equal(ub['deep'].state(u), null)
  assert.equal(ub['repeat'].state(u), ON)
  const c = mkCtx({ tool: 'compare', strategy: 'key', showEqual: true })
  const cb = Object.fromEntries(listCommands(c).map((x) => [x.id, x]))
  assert.equal(cb['strategy-key'].state(c), ON)
  assert.equal(cb['show-equal'].state(c), ON)
})
t('run: option commands call set() with the right field; toggles invert', () => {
  const ctx = mkCtx({ sortKeys: false, mergeChunks: true })
  const byId = Object.fromEntries(listCommands(ctx).map((c) => [c.id, c]))
  byId['indent-tab'].run(ctx)
  byId['sort-keys'].run(ctx)
  byId['merge-chunks'].run(ctx)
  byId['view-tree'].run(ctx)
  assert.deepEqual(ctx.set.calls, [
    ['indent', 'tab'],
    ['sortKeys', true],
    ['mergeChunks', false],
    ['view', 'tree'],
  ])
})
t('run: document commands call the page actions / app callbacks', () => {
  const actions = {
    format: spy(),
    minify: spy(),
    copy: spy(),
    download: spy(),
    openFile: spy(),
    clear: spy(),
    sample: spy(),
    sampleMulti: spy(),
    fix: spy(),
  }
  const ctx = mkCtx(
    {},
    {
      actions,
      docs: [
        { id: 'd1', name: 'a', tool: 'format' },
        { id: 'd2', name: 'b', tool: 'unwrap' },
      ],
    }
  )
  const byId = Object.fromEntries(listCommands(ctx).map((c) => [c.id, c]))
  for (const [id, name] of [
    ['format', 'format'],
    ['minify', 'minify'],
    ['copy', 'copy'],
    ['download', 'download'],
    ['open-file', 'openFile'],
    ['clear', 'clear'],
    ['sample', 'sample'],
    ['sample-multi', 'sampleMulti'],
    ['fix', 'fix'],
  ]) {
    byId[id].run(ctx)
    assert.equal(actions[name].calls.length, 1, id)
  }
  byId['new-doc'].run(ctx)
  byId['close-doc'].run(ctx)
  byId['doc:d2'].run(ctx)
  byId['tool-unwrap'].run(ctx)
  byId['theme'].run(ctx)
  byId['lang'].run(ctx)
  assert.equal(ctx.newDoc.calls.length, 1)
  assert.equal(ctx.closeDoc.calls.length, 1)
  assert.deepEqual(ctx.activateDoc.calls, [['d2']])
  assert.deepEqual(ctx.openTool.calls, [['unwrap']])
  assert.equal(ctx.toggleTheme.calls.length, 1)
  assert.deepEqual(ctx.setLang.calls, [['en']])
  assert.equal(byId['doc:d2'].hint.en, 'Unwrap')
})
t('run: missing page action is a no-op (page not mounted yet)', () => {
  const ctx = mkCtx({}, { actions: {} })
  const byId = Object.fromEntries(listCommands(ctx).map((c) => [c.id, c]))
  assert.doesNotThrow(() => byId['format'].run(ctx))
})
t(
  'search: เยื้อง and indent hit the same rows, ordered by match position, case-insensitive',
  () => {
    const cmds = listCommands(mkCtx({}))
    const a = ids(searchCommands(cmds, 'เยื้อง')),
      b = ids(searchCommands(cmds, 'INDENT'))
    assert.deepEqual(a, ['indent-2', 'indent-4', 'indent-tab'])
    assert.deepEqual(b, a)
    assert.deepEqual(ids(searchCommands(cmds, '')), ids(cmds))
    assert.deepEqual(searchCommands(cmds, 'zzz'), [])
    // 'copy' matches copy (pos 0) before 'ปิดเอกสาร'... Thai 'คัดลอก' → copy rows
    assert.deepEqual(ids(searchCommands(cmds, 'คัดลอก')), ['copy'])
  }
)
t('all ids unique and every command has th/en/glyph/run', () => {
  for (const tool of ['format', 'compare', 'unwrap']) {
    const cmds = listCommands(mkCtx({ tool }, { actions: { fix: () => {} } }))
    assert.equal(new Set(ids(cmds)).size, cmds.length)
    for (const c of cmds) assert.ok(c.th && c.en && c.glyph && typeof c.run === 'function', c.id)
  }
})
t(
  'rankCommands: ต้นคำ = primary ในกลุ่มเดิม, กลางคำ = related, กลุ่มเอกสารมาก่อนตั้งค่าเมื่อคะแนนเท่ากัน',
  () => {
    const cmds = listCommands(mkCtx({}))
    const r = rankCommands(cmds, 'เยื้อง')
    assert.deepEqual(ids(r.primary), ['indent-2', 'indent-4', 'indent-tab']) // "ระยะ|เยื้อง" ขึ้นต้นคำ (Intl.Segmenter)
    assert.deepEqual(r.related, [])
    assert.deepEqual(ids(rankCommands(cmds, 'INDENT').primary), [
      'indent-2',
      'indent-4',
      'indent-tab',
    ])
    // "หลายก้อน": ใส่ตัวอย่างหลายก้อน (เอกสาร) มาก่อน รวมหลายก้อนเป็นอาร์เรย์ (ตั้งค่า)
    assert.deepEqual(ids(rankCommands(cmds, 'หลายก้อน').primary), ['sample-multi', 'merge-chunks'])
    // ขึ้นต้นข้อความ (3) ชนะขึ้นต้นคำ (2): "เอกสารใหม่" ก่อน "จัดรูปแบบเอกสารนี้"
    assert.equal(ids(rankCommands(cmds, 'เอกสาร').primary)[0], 'new-doc')
    // กลางคำ → related เท่านั้น
    const mid = rankCommands(cmds, 'ument')
    assert.deepEqual(mid.primary, [])
    assert.ok(ids(mid.related).includes('format'))
    // ไม่มีคำค้น = ลำดับเดิม; ไม่เจอ = ว่างทั้งคู่
    assert.deepEqual(ids(rankCommands(cmds, '  ').primary), ids(cmds))
    assert.deepEqual(rankCommands(cmds, 'zzz'), { primary: [], related: [] })
  }
)
t('rankCommands: ภาษาที่ใช้ได้แต้มเพิ่ม, คำสั่งล่าสุดชนะเมื่อเสมอ', () => {
  const cmds = listCommands(mkCtx({}))
  // "view": โหมด en ทั้ง view-code/view-tree ขึ้นต้นคำใน en; ลำดับตาม recent
  const a = rankCommands(cmds, 'view', { lang: 'en', recent: ['view-tree'] })
  assert.deepEqual(ids(a.primary).slice(0, 2), ['view-tree', 'view-code'])
  const b = rankCommands(cmds, 'view', { lang: 'en', recent: [] })
  assert.deepEqual(ids(b.primary).slice(0, 2), ['view-code', 'view-tree'])
  // searchCommands = primary ต่อด้วย related
  assert.deepEqual(ids(searchCommands(cmds, 'เยื้อง')), ['indent-2', 'indent-4', 'indent-tab'])
})
t('recent (MRU): จำสูงสุด RECENT_LIMIT, ไม่จำ doc:<id>, localStorage พังก็ไม่ throw', () => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  }
  assert.deepEqual(readRecent(), [])
  let recent = recordRecent('format')
  recent = recordRecent('copy', recent)
  recent = recordRecent('format', recent)
  assert.deepEqual(recent, ['format', 'copy'])
  assert.deepEqual(readRecent(), ['format', 'copy'])
  assert.deepEqual(recordRecent('doc:abc', recent), recent)
  for (let i = 0; i < 10; i++) recent = recordRecent(`c${i}`, recent)
  assert.equal(recent.length, RECENT_LIMIT)
  store.set('fp-recent-commands', 'not json')
  assert.deepEqual(readRecent(), [])
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('nope')
    },
    setItem: () => {
      throw new Error('nope')
    },
  }
  assert.deepEqual(readRecent(), [])
  assert.deepEqual(recordRecent('x', []), ['x'])
  delete globalThis.localStorage
})
done()
