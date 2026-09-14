// Command registry สำหรับ ⌘K — ทุกคำสั่งที่ทำได้จาก UI อยู่ที่นี่ที่เดียว
//
// คำสั่ง = { id, th, en, group, glyph, keys?, when?(ctx), run(ctx), state?(ctx) → 'เปิดอยู่' | null }
// ctx มาจาก App: { doc, docs, actions, set, openTool, newDoc, closeDoc, activateDoc, theme, toggleTheme,
//   lang, setLang } — `actions` คือ action ของหน้าที่ active (hooks/useActions.js) ปุ่มในหน้าเรียกตัวเดียวกัน

export const GROUPS = [
  { id: 'document', th: 'เอกสาร', en: 'Document' },
  { id: 'options', th: 'ตั้งค่า', en: 'Options' },
  { id: 'tools', th: 'เครื่องมือ', en: 'Tools' },
  { id: 'general', th: 'ทั่วไป', en: 'General' },
]

export const ON = 'เปิดอยู่'
const onIf = (cond) => (cond ? ON : null)
const tool =
  (...tools) =>
  (ctx) =>
    tools.includes(ctx.doc.tool)

const TOOL_LABEL = {
  format: { th: 'จัดรูปแบบ JSON', en: 'Formatter' },
  compare: { th: 'เปรียบเทียบ 2 ก้อน', en: 'Diff' },
  unwrap: { th: 'สตริง → JSON', en: 'Unwrap' },
}

// เรียก action ของหน้า ถ้าหน้ายังไม่ได้ลงทะเบียน (ยังไม่ mount) ก็ไม่ทำอะไร
const act = (name) => (ctx) => ctx.actions[name]?.()

const STATIC = [
  // ---- เอกสาร ----
  {
    id: 'format',
    th: 'จัดรูปแบบเอกสารนี้',
    en: 'Format document',
    group: 'document',
    glyph: '{ }',
    keys: '⌘↵',
    when: tool('format'),
    run: act('format'),
  },
  {
    id: 'minify',
    th: 'ย่อขนาด',
    en: 'Minify',
    group: 'document',
    glyph: '⇤',
    when: tool('format'),
    run: act('minify'),
  },
  {
    id: 'fix',
    th: 'แก้ให้อัตโนมัติ',
    en: 'Fix automatically',
    group: 'document',
    glyph: '✦',
    when: (ctx) => ctx.doc.tool === 'format' && !!ctx.actions.fix,
    run: act('fix'),
  },
  {
    id: 'unwrap',
    th: 'แกะสตริง',
    en: 'Unwrap string',
    group: 'document',
    glyph: '"⤷',
    keys: '⌘↵',
    when: tool('unwrap'),
    run: act('unwrap'),
  },
  {
    id: 'copy',
    th: 'คัดลอกผลลัพธ์',
    en: 'Copy result',
    group: 'document',
    glyph: '⎘',
    when: tool('format', 'unwrap'),
    run: act('copy'),
  },
  {
    id: 'download',
    th: 'ดาวน์โหลดผลลัพธ์',
    en: 'Download result',
    group: 'document',
    glyph: '↓',
    when: tool('format', 'unwrap'),
    run: act('download'),
  },
  {
    id: 'send-to-formatter',
    th: 'ส่งไปหน้าจัดรูปแบบ',
    en: 'Send to Formatter',
    group: 'document',
    glyph: '→',
    when: tool('unwrap'),
    run: act('sendToFormatter'),
  },
  {
    id: 'swap',
    th: 'สลับซ้าย–ขวา',
    en: 'Swap sides',
    group: 'document',
    glyph: '⇄',
    when: tool('compare'),
    run: act('swap'),
  },
  {
    id: 'copy-report',
    th: 'คัดลอกรายงาน',
    en: 'Copy report',
    group: 'document',
    glyph: '⎘',
    when: tool('compare'),
    run: act('copyReport'),
  },
  {
    id: 'open-file',
    th: 'เปิดไฟล์',
    en: 'Open file',
    group: 'document',
    glyph: '↥',
    when: tool('format'),
    run: act('openFile'),
  },
  {
    id: 'clear',
    th: 'ล้างเอกสารนี้',
    en: 'Clear document',
    group: 'document',
    glyph: '⌫',
    run: act('clear'),
  },
  {
    id: 'sample',
    th: 'ใส่ตัวอย่าง',
    en: 'Insert sample',
    group: 'document',
    glyph: '¶',
    when: tool('format', 'compare'),
    run: act('sample'),
  },
  {
    id: 'sample-multi',
    th: 'ใส่ตัวอย่างหลายก้อน',
    en: 'Insert multi-chunk sample',
    group: 'document',
    glyph: '¶',
    when: tool('format'),
    run: act('sampleMulti'),
  },
  {
    id: 'sample-unwrap',
    th: 'ใส่ตัวอย่างสตริง JSON',
    en: 'Insert escaped sample',
    group: 'document',
    glyph: '¶',
    when: tool('unwrap'),
    run: act('sampleSimple'),
  },
  {
    id: 'sample-nested',
    th: 'ใส่ตัวอย่างซ้อนในฟิลด์',
    en: 'Insert nested sample',
    group: 'document',
    glyph: '¶',
    when: tool('unwrap'),
    run: act('sampleNested'),
  },
  {
    id: 'new-doc',
    th: 'เอกสารใหม่',
    en: 'New document',
    group: 'document',
    glyph: '+',
    run: (ctx) => ctx.newDoc(),
  },
  {
    id: 'close-doc',
    th: 'ปิดเอกสารนี้',
    en: 'Close document',
    group: 'document',
    glyph: '×',
    run: (ctx) => ctx.closeDoc(),
  },

  // ---- ตั้งค่า ----
  {
    id: 'indent-2',
    th: 'ระยะเยื้อง 2 ช่อง',
    en: 'Indent 2',
    group: 'options',
    glyph: '⇥',
    when: tool('format', 'unwrap'),
    run: (ctx) => ctx.set('indent', '2'),
    state: (ctx) => onIf(ctx.doc.indent === '2'),
  },
  {
    id: 'indent-4',
    th: 'ระยะเยื้อง 4 ช่อง',
    en: 'Indent 4',
    group: 'options',
    glyph: '⇥',
    when: tool('format', 'unwrap'),
    run: (ctx) => ctx.set('indent', '4'),
    state: (ctx) => onIf(ctx.doc.indent === '4'),
  },
  {
    id: 'indent-tab',
    th: 'ระยะเยื้องแบบแท็บ',
    en: 'Indent tab',
    group: 'options',
    glyph: '⇥',
    when: tool('format', 'unwrap'),
    run: (ctx) => ctx.set('indent', 'tab'),
    state: (ctx) => onIf(ctx.doc.indent === 'tab'),
  },
  {
    id: 'sort-keys',
    th: 'เรียงคีย์ A→Z',
    en: 'Sort keys',
    group: 'options',
    glyph: 'A→Z',
    when: tool('format'),
    run: (ctx) => ctx.set('sortKeys', !ctx.doc.sortKeys),
    state: (ctx) => onIf(ctx.doc.sortKeys),
  },
  {
    id: 'merge-chunks',
    th: 'รวมหลายก้อนเป็นอาร์เรย์',
    en: 'Merge chunks',
    group: 'options',
    glyph: '[ ]',
    when: tool('format'),
    run: (ctx) => ctx.set('mergeChunks', !ctx.doc.mergeChunks),
    state: (ctx) => onIf(ctx.doc.mergeChunks),
  },
  {
    id: 'view-code',
    th: 'มุมมองโค้ด',
    en: 'Code view',
    group: 'options',
    glyph: '</>',
    when: tool('format', 'unwrap'),
    run: (ctx) => ctx.set('view', 'code'),
    state: (ctx) => onIf(ctx.doc.view === 'code'),
  },
  {
    id: 'view-tree',
    th: 'มุมมองโครงสร้าง',
    en: 'Tree view',
    group: 'options',
    glyph: '⊞',
    when: tool('format', 'unwrap'),
    run: (ctx) => ctx.set('view', 'tree'),
    state: (ctx) => onIf(ctx.doc.view === 'tree'),
  },
  {
    id: 'strategy-index',
    th: 'อาร์เรย์เทียบตามลำดับ',
    en: 'Arrays by index',
    group: 'options',
    glyph: '≡',
    when: tool('compare'),
    run: (ctx) => ctx.set('strategy', 'index'),
    state: (ctx) => onIf(ctx.doc.strategy === 'index'),
  },
  {
    id: 'strategy-key',
    th: 'จับคู่อาร์เรย์ด้วยคีย์',
    en: 'Match arrays by key',
    group: 'options',
    glyph: '#',
    when: tool('compare'),
    run: (ctx) => ctx.set('strategy', 'key'),
    state: (ctx) => onIf(ctx.doc.strategy === 'key'),
  },
  {
    id: 'show-equal',
    th: 'แสดงค่าที่เหมือนกันด้วย',
    en: 'Show equal',
    group: 'options',
    glyph: '=',
    when: tool('compare'),
    run: (ctx) => ctx.set('showEqual', !ctx.doc.showEqual),
    state: (ctx) => onIf(ctx.doc.showEqual),
  },
  {
    id: 'deep',
    th: 'แกะสตริงในฟิลด์ย่อย',
    en: 'Deep unwrap',
    group: 'options',
    glyph: '⤵',
    when: tool('unwrap'),
    run: (ctx) => ctx.set('deep', !ctx.doc.deep),
    state: (ctx) => onIf(ctx.doc.deep),
  },

  // ---- เครื่องมือ ----
  ...['format', 'compare', 'unwrap'].map((id) => ({
    id: `tool-${id}`,
    th: `ไปที่ ${TOOL_LABEL[id].th}`,
    en: `Go to ${TOOL_LABEL[id].en}`,
    group: 'tools',
    glyph: { format: '{ }', compare: '⇄', unwrap: '"⤷' }[id],
    run: (ctx) => ctx.openTool(id),
    state: (ctx) => onIf(ctx.doc.tool === id),
  })),

  // ---- ทั่วไป ----
  {
    id: 'theme',
    th: 'สลับธีมมืด / สว่าง',
    en: 'Toggle theme',
    group: 'general',
    glyph: '☀︎',
    run: (ctx) => ctx.toggleTheme(),
    state: (ctx) => onIf(ctx.theme === 'light'),
  },
  {
    id: 'lang',
    th: 'สลับภาษาป้ายกำกับ TH / EN',
    en: 'Toggle label language',
    group: 'general',
    glyph: 'TH',
    run: (ctx) => ctx.setLang(ctx.lang === 'en' ? 'th' : 'en'),
    state: (ctx) => onIf(ctx.lang === 'en'),
  },
]

// คำสั่งสลับเอกสาร สร้างจาก docs ที่เปิดอยู่ (ยกเว้นอันที่ active)
function docCommands(ctx) {
  return ctx.docs
    .filter((d) => d.id !== ctx.doc.id)
    .map((d) => ({
      id: `doc:${d.id}`,
      th: `ไปที่ ${d.name}`,
      en: `Go to ${d.name}`,
      group: 'document',
      glyph: '▸',
      hint: TOOL_LABEL[d.tool],
      run: (c) => c.activateDoc(d.id),
    }))
}

// รายการคำสั่งที่ใช้ได้ในสถานะปัจจุบัน (ผ่าน when แล้ว) เรียงตามกลุ่ม
export function listCommands(ctx) {
  return [...STATIC, ...docCommands(ctx)].filter((cmd) => !cmd.when || cmd.when(ctx))
}

// ค้นหา: substring ไม่สนตัวพิมพ์ทั้ง th และ en เรียงตามตำแหน่งที่พบ (เจอเร็ว = ตรงกว่า)
export function searchCommands(commands, query) {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  return commands
    .map((cmd) => {
      const positions = [cmd.th, cmd.en]
        .map((s) => s.toLowerCase().indexOf(q))
        .filter((p) => p >= 0)
      return positions.length ? { cmd, pos: Math.min(...positions) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.cmd)
}
