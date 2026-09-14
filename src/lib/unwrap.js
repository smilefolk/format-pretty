// แกะ "JSON ที่ถูกทำให้เป็นสตริง" กลับมาเป็นข้อมูล JSON จริง
// รองรับทั้งแบบมีเครื่องหมายคำพูดครอบ  "{\"a\":1}"  และแบบวางมาดิบ ๆ  {\"a\":1}
// รวมถึงกรณีถูก escape ซ้อนกันหลายชั้น
//
// - unwrapJson(text): แกะชั้นนอก (ทั้งก้อน) — คืน layers (ตัวเลข) และ peels [{ n, where:'string' }] สำหรับ chain card
// - unwrapNested(value): แกะสตริง JSON ที่ซ่อนในฟิลด์ — คืน fields [{ path, depth }]; แกะจนสุดในรอบเดียว
//   ทั้งสตริง→อ็อบเจ็กต์ (recursive) และสตริง→สตริง (escape ซ้อน ≤ MAX_STRING_LAYERS ชั้นต่อฟิลด์) — ตัดสินใจใน #56
//   ว่าไม่ต้องมี toggle "แกะซ้ำ" เพราะโหมดปกติที่เหลือสตริงค้างไว้ทำให้ผู้ใช้งง

import { parseJson } from './json'
import { childPath } from './path'

const MAX_LAYERS = 12
// กันสตริงที่ escape ซ้อนไม่รู้จบ (เคสเทียม) — ต่อฟิลด์
const MAX_STRING_LAYERS = 8

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
 * คืน { value, count, fields:[{ path, depth }] } — depth = จำนวนชั้นที่ซ้อนอยู่ในฟิลด์ที่แกะมาก่อน + 1
 */
export function unwrapNested(value) {
  const fields = []

  const walk = (node, path, depth) => {
    if (typeof node === 'string') {
      // ปอกสตริงที่ escape ซ้อน ("\"{…}\"") ทีละชั้นจนกว่าจะได้ JSON จริงหรือหมดชั้น — เฉพาะเมื่อข้างในยัง
      // ดูเหมือน JSON (ไม่แตะ "\"hello\"" / "42") และแต่ละชั้นต้อง parse ผ่านจึงไม่ทำลายข้อมูล
      let text = node.trim()
      for (let layer = 0; layer <= MAX_STRING_LAYERS; layer++) {
        if (!LOOKS_JSON_RE.test(text)) return node
        const result = parseJson(text)
        if (!result.ok) return node
        if (typeof result.value === 'object' && result.value !== null) {
          fields.push({ path, depth })
          return walk(result.value, path, depth + 1)
        }
        if (typeof result.value !== 'string') return node
        text = result.value.trim()
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

  const out = walk(value, '', 1)
  return { value: out, count: fields.length, fields }
}
