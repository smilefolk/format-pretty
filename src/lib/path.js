// สร้าง path แบบ JSONPath อย่างง่าย ใช้ร่วมกันระหว่าง diff.js (root '$' → `$.a.b[0]`) และ unwrap.js
// (root '' → `a.b[0]`); คีย์ที่ไม่ใช่ identifier ครอบด้วย ["…"]

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export function childPath(path, key) {
  if (typeof key === 'number') return `${path}[${key}]`
  if (IDENT_RE.test(key)) return path ? `${path}.${key}` : key
  return `${path}[${JSON.stringify(key)}]`
}
