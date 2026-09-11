// แก้ JSON ที่ผิดพลาดแบบ "กลไก" ให้อัตโนมัติ — ทำทีละจุดจากตำแหน่ง error ของ parseJson แล้ว re-parse ยืนยันทุกรอบ
// รองรับ: จุลภาคท้ายก่อน } ] · จุลภาคซ้ำ ,, · single quote ครอบคีย์/ค่า · คีย์ที่ไม่มีเครื่องหมายคำพูด
// ไม่แตะอะไรที่อยู่ในสตริงที่ถูกต้อง เพราะแก้เฉพาะตรงจุดที่ scanner สะดุดเท่านั้น
// คืน { fixed, applied: [...ชนิดที่แก้ตามลำดับ] } หรือ null ถ้าไม่มีอะไรต้องแก้ / แก้แล้วยังไม่ผ่านใน MAX_ROUNDS

import { parseJson } from './json'

const MAX_ROUNDS = 5
const WS = ' \t\n\r'
const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/y

// index จาก line/column (1-based) ที่ parseJson รายงาน
function indexAt(text, line, column) {
  let index = 0
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf('\n', index)
    if (nl < 0) return text.length
    index = nl + 1
  }
  return index + column - 1
}

const prevNonWs = (text, i) => {
  let j = i - 1
  while (j >= 0 && WS.includes(text[j])) j--
  return j
}
const nextNonWs = (text, i) => {
  let j = i
  while (j < text.length && WS.includes(text[j])) j++
  return j
}

// 1) จุลภาคท้ายก่อน } หรือ ] — error ชี้ที่จุลภาคหรือช่องว่างหลังมัน หรือที่ตัวปิดเอง
function trailingComma(text, index) {
  let comma = text[index] === ',' ? index : prevNonWs(text, index)
  if (text[comma] !== ',') {
    // error อาจชี้ที่ } เอง — ถอยจากตัวปิดไปหาจุลภาค
    const closer = nextNonWs(text, index)
    if (!'}]'.includes(text[closer])) return null
    comma = prevNonWs(text, closer)
    if (text[comma] !== ',') return null
  }
  const closer = nextNonWs(text, comma + 1)
  if (!'}]'.includes(text[closer])) return null
  return text.slice(0, comma) + text.slice(comma + 1)
}

// 2) จุลภาคซ้ำ — error ชี้ที่จุลภาคตัวที่สอง
function doubleComma(text, index) {
  if (text[index] !== ',') return null
  if (text[prevNonWs(text, index)] !== ',') return null
  return text.slice(0, index) + text.slice(index + 1)
}

// 3) single quote ครอบสตริง — แปลงเป็น double quote; \' ข้างในกลายเป็น ' และ " ข้างในถูก escape
function singleQuote(text, index) {
  if (text[index] !== "'") return null
  let out = ''
  for (let i = index + 1; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\') {
      const next = text[i + 1]
      if (next === "'") out += "'"
      else out += ch + (next ?? '')
      i++
      continue
    }
    if (ch === "'") return `${text.slice(0, index)}"${out}"${text.slice(i + 1)}`
    if (ch === '\n') return null
    out += ch === '"' ? '\\"' : ch
  }
  return null
}

// 4) คีย์ที่ไม่มีเครื่องหมายคำพูด — เฉพาะ identifier ที่ตามด้วย :
function unquotedKey(text, index) {
  IDENT_RE.lastIndex = index
  const m = IDENT_RE.exec(text)
  if (!m || m.index !== index) return null
  const end = index + m[0].length
  if (text[nextNonWs(text, end)] !== ':') return null
  return `${text.slice(0, index)}"${m[0]}"${text.slice(end)}`
}

const FIXERS = [
  ['double-comma', doubleComma],
  ['trailing-comma', trailingComma],
  ['single-quote', singleQuote],
  ['unquoted-key', unquotedKey],
]

export function fixJson(text) {
  let current = text
  const applied = []

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const result = parseJson(current)
    if (result.ok) return applied.length ? { fixed: current, applied } : null
    if (round === MAX_ROUNDS || !result.error?.line) return null

    const index = indexAt(current, result.error.line, result.error.column)
    let next = null
    for (const [kind, fixer] of FIXERS) {
      next = fixer(current, index)
      if (next !== null && next !== current) {
        applied.push(kind)
        break
      }
      next = null
    }
    if (next === null) return null
    current = next
  }
  return null
}
