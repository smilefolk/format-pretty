// เปรียบเทียบค่า JSON สองก้อนแบบลึก แล้วคืนรายการจุดที่ต่างกัน
//
// อาร์เรย์เทียบตามลำดับ (index) เป็นค่าเริ่มต้น หรือส่ง `arrayKey` เพื่อจับคู่สมาชิกด้วยค่าของคีย์นั้น
// (path ตาม D6: `$.items[id=7]`, สตริง → `$.items[sku="X1"]`) — อาร์เรย์ที่จับคู่ไม่ได้จะ fallback เป็น index
// เฉพาะอาร์เรย์นั้น และรายงาน path ไว้ใน `fallbacks` ของ diffJsonWithMeta()

function kindOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const isContainer = (kind) => kind === 'object' || kind === 'array'

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function childPath(path, key) {
  if (typeof key === 'number') return `${path}[${key}]`
  return IDENT_RE.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
}

// ทำดัชนีสมาชิกอาร์เรย์ด้วยค่าคีย์ — คืน null ถ้าไม่เข้าเงื่อนไข (มีสมาชิกที่ไม่ใช่อ็อบเจ็กต์, ไม่มีคีย์,
// ค่าคีย์ไม่ใช่ string/number, หรือค่าคีย์ซ้ำ) — id เป็น JSON.stringify จึงแยก 7 กับ "7" ออกจากกัน
function indexByKey(items, key) {
  const map = new Map()
  for (const item of items) {
    if (kindOf(item) !== 'object' || !(key in item)) return null
    const value = item[key]
    if (typeof value !== 'string' && typeof value !== 'number') return null
    const id = JSON.stringify(value)
    if (map.has(id)) return null
    map.set(id, item)
  }
  return map
}

// เดินสองก้อนพร้อมกันแล้วเรียก visit ตามเหตุการณ์ — diffJsonWithMeta และ countKeys ใช้ตัวเดินเดียวกัน
// เพื่อให้ strategy การจับคู่อาร์เรย์ตรงกันเสมอ
function traverse(left, right, arrayKey, visit) {
  const fallbacks = []

  const walk = (a, b, path) => {
    const ka = kindOf(a)
    const kb = kindOf(b)

    if (ka !== kb) return visit.type(path, a, b, [ka, kb])

    if (ka === 'object') {
      const keys = [...Object.keys(a), ...Object.keys(b).filter((k) => !(k in a))]
      for (const key of keys) {
        const next = childPath(path, key)
        if (!(key in a)) visit.added(next, b[key])
        else if (!(key in b)) visit.removed(next, a[key])
        else walk(a[key], b[key], next)
      }
      return
    }

    if (ka === 'array') {
      const ma = arrayKey ? indexByKey(a, arrayKey) : null
      const mb = ma ? indexByKey(b, arrayKey) : null
      if (ma && mb) {
        const keyPath = (id) => `${path}[${arrayKey}=${id}]`
        for (const [id, item] of ma) {
          if (mb.has(id)) walk(item, mb.get(id), keyPath(id))
          else visit.removed(keyPath(id), item)
        }
        for (const [id, item] of mb) if (!ma.has(id)) visit.added(keyPath(id), item)
        return
      }
      // จับคู่ด้วยคีย์ไม่ได้ → เทียบตามลำดับ; รายงานเฉพาะอาร์เรย์ที่มีอ็อบเจ็กต์อยู่ (อาร์เรย์ของ primitive
      // เทียบตามลำดับเป็นเรื่องปกติ ไม่ต้องเตือน)
      if (arrayKey && [...a, ...b].some((item) => kindOf(item) === 'object')) fallbacks.push(path)
      const len = Math.max(a.length, b.length)
      for (let i = 0; i < len; i++) {
        const next = childPath(path, i)
        if (i >= a.length) visit.added(next, b[i])
        else if (i >= b.length) visit.removed(next, a[i])
        else walk(a[i], b[i], next)
      }
      return
    }

    if (a === b) visit.equal(path, a)
    else visit.changed(path, a, b)
  }

  walk(left, right, '$')
  return fallbacks
}

/**
 * ชนิดของความต่าง
 *   added    – มีเฉพาะฝั่งขวา
 *   removed  – มีเฉพาะฝั่งซ้าย
 *   changed  – มีทั้งสองฝั่งแต่ค่าไม่เท่ากัน
 *   type     – ชนิดข้อมูลไม่ตรงกัน (เช่น "1" กับ 1)
 *   equal    – ใบที่เท่ากัน (เฉพาะเมื่อ includeEqual) — summarize / toReport ไม่นับ
 *
 * คืน { diffs, fallbacks } — fallbacks คือ path ของอาร์เรย์ที่ขอจับคู่ด้วยคีย์แต่ทำไม่ได้
 */
export function diffJsonWithMeta(left, right, { arrayKey = null, includeEqual = false } = {}) {
  const diffs = []
  const fallbacks = traverse(left, right, arrayKey, {
    type: (path, a, b, kinds) => diffs.push({ path, type: 'type', left: a, right: b, kinds }),
    added: (path, value) => diffs.push({ path, type: 'added', right: value }),
    removed: (path, value) => diffs.push({ path, type: 'removed', left: value }),
    changed: (path, a, b) => diffs.push({ path, type: 'changed', left: a, right: b }),
    equal: (path, value) => {
      if (includeEqual) diffs.push({ path, type: 'equal', left: value, right: value })
    },
  })
  return { diffs, fallbacks }
}

export function diffJson(left, right, options) {
  return diffJsonWithMeta(left, right, options).diffs
}

// นับใบ (leaf path) ในค่าหนึ่ง — คอนเทนเนอร์ว่างไม่นับ
function countLeaves(value) {
  const kind = kindOf(value)
  if (kind === 'array') return value.reduce((n, v) => n + countLeaves(v), 0)
  if (kind === 'object') return Object.values(value).reduce((n, v) => n + countLeaves(v), 0)
  return 1
}

// สำหรับการ์ดสรุป: matched = ใบที่มีทั้งสองฝั่งและเท่ากัน, total = union ของ leaf path ทั้งสองฝั่ง
// (ใช้ strategy การจับคู่อาร์เรย์เดียวกับ diff)
export function countKeys(left, right, { arrayKey = null } = {}) {
  let matched = 0
  let total = 0
  traverse(left, right, arrayKey, {
    // ใบกับใบที่ path เดียวกันนับ 1; ใบกับคอนเทนเนอร์ path ไม่ซ้ำกันจึงนับแยก
    type: (path, a, b, [ka, kb]) => {
      if (!isContainer(ka) && !isContainer(kb)) total += 1
      else total += countLeaves(a) + countLeaves(b)
    },
    added: (path, value) => (total += countLeaves(value)),
    removed: (path, value) => (total += countLeaves(value)),
    changed: () => (total += 1),
    equal: () => {
      total += 1
      matched += 1
    },
  })
  return { matched, total }
}

export function summarize(diffs) {
  const acc = { added: 0, removed: 0, changed: 0, type: 0 }
  for (const d of diffs) if (d.type in acc) acc[d.type]++
  return acc
}

export function preview(value, limit = 120) {
  if (value === undefined) return '—'
  const text = JSON.stringify(value)
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

const LABEL = {
  added: 'เฉพาะขวา',
  removed: 'เฉพาะซ้าย',
  changed: 'ค่าต่างกัน',
  type: 'ชนิดต่างกัน',
  equal: 'เหมือนกัน',
}

export const typeLabel = (type) => LABEL[type]

export function toReport(diffs) {
  const rows = diffs.filter((d) => d.type !== 'equal')
  if (rows.length === 0) return 'ข้อมูลสองก้อนเหมือนกันทุกประการ'
  return rows
    .map((d) => {
      const head = `${d.path}  [${LABEL[d.type]}]`
      if (d.type === 'added') return `${head}\n  ขวา: ${preview(d.right, 400)}`
      if (d.type === 'removed') return `${head}\n  ซ้าย: ${preview(d.left, 400)}`
      return `${head}\n  ซ้าย: ${preview(d.left, 400)}\n  ขวา: ${preview(d.right, 400)}`
    })
    .join('\n')
}
