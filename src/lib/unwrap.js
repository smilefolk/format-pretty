// แกะ "JSON ที่ถูกทำให้เป็นสตริง" กลับมาเป็นข้อมูล JSON จริง
// รองรับทั้งแบบมีเครื่องหมายคำพูดครอบ  "{\"a\":1}"  และแบบวางมาดิบ ๆ  {\"a\":1}
// รวมถึงกรณีถูก escape ซ้อนกันหลายชั้น
//
// - unwrapJson(text): แกะชั้นนอก (ทั้งก้อน) — คืน layers (ตัวเลข) และ peels [{ n, where:'string' }] สำหรับ chain card
// - unwrapNested(value, { repeat }): แกะสตริง JSON ที่ซ่อนในฟิลด์ — คืน fields [{ path, depth }] และ passes;
//   หนึ่งรอบแกะสตริง→อ็อบเจ็กต์ให้สุด แต่สตริง→สตริง (escape ซ้อน) แกะทีละชั้น จึงต้อง repeat ถ้าฟิลด์
//   escape ต่างระดับกัน (สูงสุด MAX_PASSES รอบ)

import { parseJson } from './json'
import { childPath } from './path'

const MAX_LAYERS = 12
const MAX_PASSES = 8

// ข้อความที่ "ดูเหมือน JSON" พอจะลองแกะ: อ็อบเจ็กต์ อาร์เรย์ หรือสตริงที่ครอบด้วยเครื่องหมายคำพูด
const LOOKS_JSON_RE = /^["{[]/

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

const peelsOf = (layers) => Array.from({ length: layers }, (_, i) => ({ n: i + 1, where: 'string' }))

/**
 * แกะทีละชั้นจนกว่าจะได้ค่าที่ไม่ใช่สตริง
 * คืน { ok, value, layers, merged, peels } หรือ { ok:false, layers, peeled, error, peels }
 */
export function unwrapJson(text) {
  let current = text.trim()
  if (!current) return { ok: false, empty: true, layers: 0, peels: [] }

  for (let layers = 0; layers <= MAX_LAYERS; layers++) {
    const result = parseJson(current)

    if (result.ok) {
      if (typeof result.value === 'string') {
        current = result.value.trim()
        continue
      }
      return { ok: true, value: result.value, layers, merged: result.merged, peels: peelsOf(layers) }
    }

    const inner = unescapeAsStringBody(current)
    if (inner !== null && inner.trim() !== current) {
      current = inner.trim()
      continue
    }

    return { ok: false, layers, peeled: current, error: result.error, peels: peelsOf(layers) }
  }

  return {
    ok: false,
    layers: MAX_LAYERS,
    peeled: current,
    error: { message: `แกะเกิน ${MAX_LAYERS} ชั้นแล้วยังไม่พบ JSON` },
    peels: peelsOf(MAX_LAYERS),
  }
}

/**
 * แกะสตริงที่ซ่อน JSON ไว้ "ภายในแต่ละฟิลด์" ด้วย
 * เช่น {"body":"{\"a\":1}"} → {"body":{"a":1}}
 * คืน { value, count, fields:[{ path, depth }], passes } — depth = จำนวนชั้นที่ซ้อนอยู่ในฟิลด์ที่แกะมาก่อน + 1
 */
export function unwrapNested(value, { repeat = false } = {}) {
  const fields = []
  let changed = false

  const walk = (node, path, depth) => {
    if (typeof node === 'string') {
      const trimmed = node.trim()
      if (!LOOKS_JSON_RE.test(trimmed)) return node
      const result = parseJson(trimmed)
      if (!result.ok) return node
      if (typeof result.value === 'object' && result.value !== null) {
        fields.push({ path, depth })
        changed = true
        return walk(result.value, path, depth + 1)
      }
      // สตริงที่ escape ซ้อน: แกะออกหนึ่งชั้นเฉพาะเมื่อข้างในยังดูเหมือน JSON (ไม่แตะ "\"hello\"")
      if (typeof result.value === 'string' && LOOKS_JSON_RE.test(result.value.trim())) {
        changed = true
        return result.value.trim()
      }
      return node
    }
    if (Array.isArray(node)) return node.map((item, i) => walk(item, childPath(path, i), depth))
    if (node && typeof node === 'object') {
      const out = {}
      for (const key of Object.keys(node)) out[key] = walk(node[key], childPath(path, key), depth)
      return out
    }
    return node
  }

  let current = value
  let passes = 0
  do {
    changed = false
    current = walk(current, '', 1)
    passes++
  } while (repeat && changed && passes < MAX_PASSES)
  // รอบสุดท้ายที่ไม่มีอะไรเปลี่ยนคือรอบยืนยัน ไม่นับเป็นรอบที่แกะ
  if (passes > 1 && !changed) passes--

  return { value: current, count: fields.length, fields, passes }
}
