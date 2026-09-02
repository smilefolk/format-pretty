// แกะ "JSON ที่ถูกทำให้เป็นสตริง" กลับมาเป็นข้อมูล JSON จริง
// รองรับทั้งแบบมีเครื่องหมายคำพูดครอบ  "{\"a\":1}"  และแบบวางมาดิบ ๆ  {\"a\":1}
// รวมถึงกรณีถูก escape ซ้อนกันหลายชั้น

import { parseJson } from './json'

const MAX_LAYERS = 12

// พยายามตีความข้อความทั้งก้อนเป็น "เนื้อในของสตริง JSON"
function unescapeAsStringBody(text) {
  const escaped = text
    .replace(/\\?\r\n?/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
  try {
    const value = JSON.parse(`"${escaped}"`)
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

/**
 * แกะทีละชั้นจนกว่าจะได้ค่าที่ไม่ใช่สตริง
 * คืน { ok, value, layers, merged } หรือ { ok:false, layers, peeled, error }
 */
export function unwrapJson(text) {
  let current = text.trim()
  if (!current) return { ok: false, empty: true, layers: 0 }

  for (let layers = 0; layers <= MAX_LAYERS; layers++) {
    const result = parseJson(current)

    if (result.ok) {
      if (typeof result.value === 'string') {
        current = result.value.trim()
        continue
      }
      return { ok: true, value: result.value, layers, merged: result.merged }
    }

    const inner = unescapeAsStringBody(current)
    if (inner !== null && inner.trim() !== current) {
      current = inner.trim()
      continue
    }

    return { ok: false, layers, peeled: current, error: result.error }
  }

  return {
    ok: false,
    layers: MAX_LAYERS,
    peeled: current,
    error: { message: `แกะเกิน ${MAX_LAYERS} ชั้นแล้วยังไม่พบ JSON` },
  }
}

/**
 * แกะสตริงที่ซ่อน JSON ไว้ "ภายในแต่ละฟิลด์" ด้วย
 * เช่น {"body":"{\"a\":1}"} → {"body":{"a":1}}
 */
export function unwrapNested(value) {
  let count = 0

  const walk = (node) => {
    if (typeof node === 'string') {
      const trimmed = node.trim()
      if (!/^[{[]/.test(trimmed)) return node
      const result = parseJson(trimmed)
      if (!result.ok || typeof result.value !== 'object' || result.value === null) return node
      count++
      return walk(result.value)
    }
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object') {
      const out = {}
      for (const key of Object.keys(node)) out[key] = walk(node[key])
      return out
    }
    return node
  }

  return { value: walk(value), count }
}
