// โมเดลเอกสาร (document tabs) — pure function ทั้งไฟล์ ไม่แตะ localStorage (ดู hooks/useDocs.js)
//
// ตาม D1(b): ทุก doc มี `tool` หนึ่ง tab = เอกสารของเครื่องมือหนึ่ง และตาม D8: indent/view เป็นของ doc
// state = { docs: Doc[], activeId, recent: id[] }  — `recent` คือลำดับที่เคย active ล่าสุด (MRU)
// ใช้ตอนคลิก rail เพื่อกลับไป doc ล่าสุดของเครื่องมือนั้น

export const DOC_TOOLS = ['format', 'compare', 'unwrap']
export const DOCS_VERSION = 1
// เนื้อหารวม (input + left + right) ของ doc ที่ใหญ่กว่านี้จะไม่ถูกบันทึกลง localStorage กัน quota เต็ม
export const CONTENT_LIMIT = 1024 * 1024

const NAME_PREFIX = 'เอกสาร '

export const DOC_DEFAULTS = Object.freeze({
  // เนื้อหา (ใช้ตาม tool)
  input: '',
  left: '',
  right: '',
  // Formatter / Unwrap
  indent: '2',
  sortKeys: false,
  view: 'code',
  // Formatter
  mergeChunks: true,
  // Unwrap
  deep: true,
  repeat: false,
  // Diff
  strategy: 'index',
  arrayKey: 'id',
  showEqual: false,
})

let counter = 0
const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `doc-${Date.now().toString(36)}-${(counter++).toString(36)}`

// ชื่อ "เอกสาร n" โดย n = เลขเล็กสุดที่ยังไม่มีใครใช้
export function nextDocName(docs) {
  const used = new Set()
  for (const doc of docs) {
    if (doc.name?.startsWith(NAME_PREFIX)) {
      const n = Number(doc.name.slice(NAME_PREFIX.length))
      if (Number.isInteger(n)) used.add(n)
    }
  }
  let n = 1
  while (used.has(n)) n++
  return NAME_PREFIX + n
}

export function createDoc(tool, overrides = {}, docs = []) {
  if (!DOC_TOOLS.includes(tool)) throw new Error(`ไม่รู้จักเครื่องมือ "${tool}"`)
  return {
    ...DOC_DEFAULTS,
    id: newId(),
    tool,
    name: nextDocName(docs),
    ...overrides,
  }
}

export function initialDocsState(tool = 'format') {
  const doc = createDoc(tool)
  return { docs: [doc], activeId: doc.id, recent: [doc.id] }
}

const touch = (recent, id) => [id, ...recent.filter((x) => x !== id)]

export function docsReducer(state, action) {
  switch (action.type) {
    case 'open': {
      const { doc } = action
      return {
        docs: [...state.docs, doc],
        activeId: doc.id,
        recent: touch(state.recent, doc.id),
      }
    }

    case 'activate': {
      if (!state.docs.some((d) => d.id === action.id)) return state
      return { ...state, activeId: action.id, recent: touch(state.recent, action.id) }
    }

    case 'update': {
      const index = state.docs.findIndex((d) => d.id === action.id)
      if (index < 0) return state
      const docs = state.docs.slice()
      docs[index] = { ...docs[index], ...action.patch }
      return { ...state, docs }
    }

    case 'rename': {
      const name = action.name?.trim()
      if (!name) return state
      return docsReducer(state, { type: 'update', id: action.id, patch: { name } })
    }

    case 'close': {
      const index = state.docs.findIndex((d) => d.id === action.id)
      if (index < 0) return state
      const closed = state.docs[index]
      const docs = state.docs.filter((d) => d.id !== action.id)
      const recent = state.recent.filter((id) => id !== action.id)

      // ปิดอันสุดท้าย → doc เปล่าของ tool เดิม (README: close the last tab → empty state)
      if (docs.length === 0) {
        const blank = createDoc(closed.tool)
        return { docs: [blank], activeId: blank.id, recent: [blank.id] }
      }

      if (state.activeId !== action.id) return { ...state, docs, recent }

      // ปิดอันที่ active → ไปทางขวา ถ้าไม่มีก็ซ้าย
      const next = docs[Math.min(index, docs.length - 1)]
      return { docs, activeId: next.id, recent: touch(recent, next.id) }
    }

    case 'replace':
      return action.state

    default:
      return state
  }
}

export const activeDoc = (state) => state.docs.find((d) => d.id === state.activeId) ?? null

// doc ที่ active ล่าสุดของเครื่องมือนั้น (ไม่มี → null)
export function latestDocForTool(state, tool) {
  for (const id of state.recent) {
    const doc = state.docs.find((d) => d.id === id)
    if (doc?.tool === tool) return doc
  }
  return state.docs.find((d) => d.tool === tool) ?? null
}

// ---------- persist (#15) — แปลงไป/กลับสตริง ส่วนการเขียน localStorage อยู่ใน hook ----------

const contentSize = (doc) => doc.input.length + doc.left.length + doc.right.length

export function serializeDocs(state) {
  const docs = state.docs.map(({ tooLarge, ...doc }) => {
    // ธง tooLarge คิดใหม่ทุกครั้ง — doc ที่เคยโหลดมาพร้อมธงแล้วเนื้อหาเล็กลงต้องหลุดธง
    if (contentSize(doc) <= CONTENT_LIMIT) return doc
    // ใหญ่เกิน → เก็บแต่ metadata/ตัวเลือก ติดธงไว้ให้ UI รู้ว่าเนื้อหาไม่ได้ถูกบันทึก
    return { ...doc, input: '', left: '', right: '', tooLarge: true }
  })
  return JSON.stringify({ version: DOCS_VERSION, activeDocId: state.activeId, docs })
}

// คืน state หรือ null ถ้าอ่านไม่ได้ / version ไม่ตรง / ไม่มี doc ที่ใช้ได้ — ผู้เรียกค่อยเริ่มใหม่
export function deserializeDocs(json) {
  if (typeof json !== 'string') return null
  let data
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!data || data.version !== DOCS_VERSION || !Array.isArray(data.docs)) return null

  const docs = data.docs
    .filter((d) => d && typeof d.id === 'string' && DOC_TOOLS.includes(d.tool))
    .map((d) => ({ ...DOC_DEFAULTS, ...d, name: d.name || NAME_PREFIX + '1' }))
  if (docs.length === 0) return null

  const activeId = docs.some((d) => d.id === data.activeDocId) ? data.activeDocId : docs[0].id
  return {
    docs,
    activeId,
    recent: [activeId, ...docs.map((d) => d.id).filter((id) => id !== activeId)],
  }
}
