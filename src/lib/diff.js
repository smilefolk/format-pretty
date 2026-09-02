// เปรียบเทียบค่า JSON สองก้อนแบบลึก แล้วคืนรายการจุดที่ต่างกัน

function kindOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function childPath(path, key) {
  if (typeof key === 'number') return `${path}[${key}]`
  return IDENT_RE.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
}

/**
 * ชนิดของความต่าง
 *   added    – มีเฉพาะฝั่งขวา
 *   removed  – มีเฉพาะฝั่งซ้าย
 *   changed  – มีทั้งสองฝั่งแต่ค่าไม่เท่ากัน
 *   type     – ชนิดข้อมูลไม่ตรงกัน (เช่น "1" กับ 1)
 */
export function diffJson(left, right) {
  const out = []

  const walk = (a, b, path) => {
    if (a === b) return

    const ka = kindOf(a)
    const kb = kindOf(b)

    if (ka !== kb) {
      out.push({ path, type: 'type', left: a, right: b, kinds: [ka, kb] })
      return
    }

    if (ka === 'object') {
      const keys = [...Object.keys(a), ...Object.keys(b).filter((k) => !(k in a))]
      for (const key of keys) {
        const next = childPath(path, key)
        if (!(key in a)) out.push({ path: next, type: 'added', right: b[key] })
        else if (!(key in b)) out.push({ path: next, type: 'removed', left: a[key] })
        else walk(a[key], b[key], next)
      }
      return
    }

    if (ka === 'array') {
      const len = Math.max(a.length, b.length)
      for (let i = 0; i < len; i++) {
        const next = childPath(path, i)
        if (i >= a.length) out.push({ path: next, type: 'added', right: b[i] })
        else if (i >= b.length) out.push({ path: next, type: 'removed', left: a[i] })
        else walk(a[i], b[i], next)
      }
      return
    }

    out.push({ path, type: 'changed', left: a, right: b })
  }

  walk(left, right, '$')
  return out
}

export function summarize(diffs) {
  return diffs.reduce(
    (acc, d) => {
      acc[d.type]++
      return acc
    },
    { added: 0, removed: 0, changed: 0, type: 0 }
  )
}

export function preview(value, limit = 120) {
  if (value === undefined) return '—'
  const text = JSON.stringify(value)
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

const LABEL = {
  added: 'มีเฉพาะฝั่งขวา',
  removed: 'มีเฉพาะฝั่งซ้าย',
  changed: 'ค่าต่างกัน',
  type: 'ชนิดข้อมูลต่างกัน',
}

export const typeLabel = (type) => LABEL[type]

export function toReport(diffs) {
  if (diffs.length === 0) return 'ข้อมูลสองก้อนเหมือนกันทุกประการ'
  return diffs
    .map((d) => {
      const head = `${d.path}  [${LABEL[d.type]}]`
      if (d.type === 'added') return `${head}\n  ขวา: ${preview(d.right, 400)}`
      if (d.type === 'removed') return `${head}\n  ซ้าย: ${preview(d.left, 400)}`
      return `${head}\n  ซ้าย: ${preview(d.left, 400)}\n  ขวา: ${preview(d.right, 400)}`
    })
    .join('\n')
}
