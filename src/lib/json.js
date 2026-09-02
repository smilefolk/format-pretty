// ---- แปลง JSON + หา ตำแหน่ง/บรรทัด ของ error ---------------------------------

import { lineColumnAt, scanDocuments } from './locate'

export function parseJson(text) {
  if (!text.trim()) return { ok: false, empty: true, error: null }

  // ทางลัด: เอกสารเดียวที่ถูกต้อง ให้ JSON.parse จัดการ (เร็วที่สุด)
  try {
    return { ok: true, value: JSON.parse(text), merged: 0 }
  } catch (nativeError) {
    const { parts, error } = scanDocuments(text)

    // มีค่า JSON มากกว่าหนึ่งก้อนต่อกัน — รวมให้เป็นอาร์เรย์เดียว
    if (!error && parts.length > 1) {
      const values = parts.map((part) => JSON.parse(text.slice(part.start, part.end)))
      return { ok: true, value: values, merged: values.length }
    }

    if (error) {
      return {
        ok: false,
        error: { message: error.message, ...lineColumnAt(text, error.index) },
      }
    }
    // ตัวตรวจของเราไม่เจอ (เช่น ซ้อนลึกเกินไป) — ใช้ข้อความจากเบราว์เซอร์แทน
    return { ok: false, error: { message: nativeError.message } }
  }
}

export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, k) => {
        acc[k] = sortKeysDeep(value[k])
        return acc
      }, {})
  }
  return value
}

export function stringify(value, indent) {
  return JSON.stringify(value, null, indent === 'tab' ? '\t' : Number(indent))
}

// ---- สถิติของเอกสาร ----------------------------------------------------------

export function getStats(value, text) {
  let keys = 0
  let arrays = 0
  let objects = 0
  let maxDepth = 0

  const walk = (node, depth) => {
    if (depth > maxDepth) maxDepth = depth
    if (Array.isArray(node)) {
      arrays++
      node.forEach((item) => walk(item, depth + 1))
    } else if (node && typeof node === 'object') {
      objects++
      for (const k of Object.keys(node)) {
        keys++
        walk(node[k], depth + 1)
      }
    }
  }
  walk(value, 1)

  return {
    keys,
    arrays,
    objects,
    depth: maxDepth,
    lines: text.split('\n').length,
    bytes: new Blob([text]).size,
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ---- ระบายสีไวยากรณ์ (ไม่พึ่งไลบรารีภายนอก) ---------------------------------

const TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

export function tokenize(json) {
  const out = []
  let last = 0
  let m
  TOKEN_RE.lastIndex = 0

  while ((m = TOKEN_RE.exec(json)) !== null) {
    if (m.index > last) out.push({ type: 'punct', text: json.slice(last, m.index) })

    if (m[1] !== undefined) {
      out.push({ type: m[2] ? 'key' : 'string', text: m[1] })
      if (m[2]) out.push({ type: 'punct', text: m[2] })
    } else if (m[3] !== undefined) out.push({ type: 'boolean', text: m[3] })
    else if (m[4] !== undefined) out.push({ type: 'null', text: m[4] })
    else out.push({ type: 'number', text: m[5] })

    last = TOKEN_RE.lastIndex
  }
  if (last < json.length) out.push({ type: 'punct', text: json.slice(last) })
  return out
}
