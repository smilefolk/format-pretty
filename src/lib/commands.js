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
    when: tool('format', 'unwrap'),
    run: act('openFile'),
  },
  {
    id: 'open-file-left',
    th: 'เปิดไฟล์ลงก้อนซ้าย',
    en: 'Open file into left',
    group: 'document',
    glyph: '↥',
    when: tool('compare'),
    run: act('openFileLeft'),
  },
  {
    id: 'open-file-right',
    th: 'เปิดไฟล์ลงก้อนขวา',
    en: 'Open file into right',
    group: 'document',
    glyph: '↥',
    when: tool('compare'),
    run: act('openFileRight'),
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
  {
    id: 'repeat',
    th: 'แกะซ้ำจนสุด',
    en: 'Repeat until stable',
    group: 'options',
    glyph: '↻',
    when: tool('unwrap'),
    run: (ctx) => ctx.set('repeat', !ctx.doc.repeat),
    state: (ctx) => onIf(ctx.doc.repeat),
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

// ---- ค้นหาและจัดอันดับ ----------------------------------------------------------------------
//
// คะแนนต่อคำสั่ง = คะแนนที่ดีที่สุดจาก th/en: ขึ้นต้นข้อความ 3 · ขึ้นต้นคำ 2 · กลางคำ 1 (ไม่เจอ = ไม่แสดง)
// ภาษาที่กำลังใช้ได้ +0.5; เสมอกันเรียงตามน้ำหนักกลุ่ม (เอกสาร > ตั้งค่า > เครื่องมือ > ทั่วไป) แล้วคำสั่งที่เพิ่งใช้
// ขอบเขตคำไทยใช้ Intl.Segmenter (มีในเบราว์เซอร์สมัยใหม่และ node) ไม่มีก็ถือว่าขึ้นต้นคำเฉพาะหลังช่องว่าง/เครื่องหมาย

const segmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(['th', 'en'], { granularity: 'word' })
    : null

function wordStarts(text) {
  const starts = new Set([0])
  if (segmenter) {
    for (const seg of segmenter.segment(text)) starts.add(seg.index)
  } else {
    for (const m of text.matchAll(/[\s·/→(-]+/g)) starts.add(m.index + m[0].length)
  }
  return starts
}

function matchScore(text, q) {
  const lower = text.toLowerCase()
  const index = lower.indexOf(q)
  if (index < 0) return 0
  if (index === 0) return 3
  return wordStarts(lower).has(index) ? 2 : 1
}

const GROUP_WEIGHT = Object.fromEntries(GROUPS.map((g, i) => [g.id, i]))

/**
 * จัดอันดับผลค้นหา → { primary, related }
 * - primary = ตรงที่ต้นข้อความ/ต้นคำ (แสดงในกลุ่มเดิมของคำสั่ง) · related = เจอกลางคำ (กลุ่ม "คำสั่งที่ใกล้เคียง")
 * - ไม่มีคำค้น: primary = ทุกคำสั่งตามลำดับเดิม, related = []
 */
export function rankCommands(commands, query, { lang = 'th', recent = [] } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return { primary: commands, related: [] }
  const recency = (id) => {
    const i = recent.indexOf(id)
    return i < 0 ? recent.length : i
  }
  const scored = commands
    .map((cmd, order) => {
      const th = matchScore(cmd.th, q)
      const en = matchScore(cmd.en, q)
      const best = Math.max(th, en)
      if (!best) return null
      const primaryLang = lang === 'en' ? en : th
      return { cmd, order, score: best + (primaryLang === best && best ? 0.5 : 0) }
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.score - a.score ||
        GROUP_WEIGHT[a.cmd.group] - GROUP_WEIGHT[b.cmd.group] ||
        recency(a.cmd.id) - recency(b.cmd.id) ||
        a.order - b.order
    )
  return {
    primary: scored.filter((x) => x.score >= 2).map((x) => x.cmd),
    related: scored.filter((x) => x.score < 2).map((x) => x.cmd),
  }
}

// รายการแบน (primary ก่อน related) — สำหรับที่ไม่ต้องแยกกลุ่ม
export function searchCommands(commands, query, options) {
  const { primary, related } = rankCommands(commands, query, options)
  return [...primary, ...related]
}

// ---- คำสั่งที่เพิ่งใช้ (MRU) — localStorage['fp-recent-commands'] สูงสุด RECENT_LIMIT ตัว ----------

const RECENT_KEY = 'fp-recent-commands'
export const RECENT_LIMIT = 6

export function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function recordRecent(id, recent = readRecent()) {
  // คำสั่งสลับเอกสารเฉพาะกิจ (doc:<id>) ไม่จำ
  if (id.startsWith('doc:')) return recent
  const next = [id, ...recent.filter((x) => x !== id)].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* เก็บไม่ได้ก็ใช้ในหน่วยความจำ */
  }
  return next
}
