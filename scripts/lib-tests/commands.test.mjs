import assert from 'node:assert/strict'
import { suite } from './_harness.mjs'
import { GROUPS, ON, listCommands, searchCommands } from '../../src/lib/commands.js'

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
  ])
    assert.ok(c.includes(id), id)
  for (const id of ['format', 'minify', 'indent-2', 'sort-keys', 'view-code', 'copy', 'deep'])
    assert.ok(!c.includes(id), id)
})
t('when: unwrap shows unwrap/send/deep/indent/view/samples', () => {
  const c = ids(listCommands(mkCtx({ tool: 'unwrap' })))
  for (const id of [
    'unwrap',
    'send-to-formatter',
    'deep',
    'indent-tab',
    'view-tree',
    'sample-unwrap',
    'sample-nested',
    'copy',
    'download',
  ])
    assert.ok(c.includes(id), id)
  for (const id of ['format', 'sort-keys', 'merge-chunks', 'swap', 'sample-multi', 'open-file'])
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
  const u = mkCtx({ tool: 'unwrap', deep: false })
  const ub = Object.fromEntries(listCommands(u).map((c) => [c.id, c]))
  assert.equal(ub['deep'].state(u), null)
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
done()
