// ตัวตรวจไวยากรณ์ JSON แบบเขียนเอง ใช้สำหรับสองอย่าง
//   1) ระบุ "ตำแหน่งจริง" ของข้อผิดพลาด เพราะข้อความจาก JSON.parse ของแต่ละเบราว์เซอร์บอกตำแหน่งไม่ครบ
//   2) หาขอบเขตของค่า JSON แต่ละก้อน เพื่อรวมหลายก้อนที่ต่อกันให้เป็นอาร์เรย์เดียว

const WS = ' \t\n\r'
const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y

function createScanner(text) {
  let i = 0

  const fail = (message, at = i) => {
    throw { index: Math.min(at, text.length), message }
  }
  const eof = () => i >= text.length
  const skipWs = () => {
    while (!eof() && WS.includes(text[i])) i++
  }
  const expect = (ch, what) => {
    skipWs()
    if (eof()) fail(`ข้อมูลจบก่อนกำหนด — ต้องการ ${what}`)
    if (text[i] !== ch) fail(`ต้องการ ${what} แต่พบ '${text[i]}'`)
    i++
  }

  const string = () => {
    const start = i
    i++ // เปิด "
    while (true) {
      if (eof()) fail('สตริงไม่ถูกปิดด้วยเครื่องหมาย "', start)
      const ch = text[i]
      if (ch === '"') return i++
      if (ch === '\n') fail('สตริงไม่ถูกปิดก่อนขึ้นบรรทัดใหม่', start)
      if (ch === '\\') {
        const esc = text[i + 1]
        if (esc === undefined) fail('ข้อมูลจบก่อนกำหนดหลังเครื่องหมาย \\')
        if (esc === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6)))
            fail('ลำดับ \\u ต้องตามด้วยเลขฐานสิบหก 4 หลัก', i)
          i += 6
          continue
        }
        if (!'"\\/bfnrt'.includes(esc)) fail(`ลำดับหนีอักขระไม่ถูกต้อง: \\${esc}`, i)
        i += 2
        continue
      }
      if (ch < ' ') fail('พบอักขระควบคุมในสตริง ต้องเขียนเป็น \\u00XX', i)
      i++
    }
  }

  const literal = (word) => {
    if (text.startsWith(word, i)) return (i += word.length)
    fail(`ค่าไม่ถูกต้อง — ต้องการ ${word}`)
  }

  const value = () => {
    skipWs()
    if (eof()) fail('ข้อมูลจบก่อนกำหนด — ต้องการค่า')
    const ch = text[i]

    if (ch === '{') return object()
    if (ch === '[') return array()
    if (ch === '"') return string()
    if (ch === 't') return literal('true')
    if (ch === 'f') return literal('false')
    if (ch === 'n') return literal('null')

    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      NUMBER_RE.lastIndex = i
      const m = NUMBER_RE.exec(text)
      if (!m || m.index !== i) fail('รูปแบบตัวเลขไม่ถูกต้อง')
      i = NUMBER_RE.lastIndex
      if (!eof() && /[0-9a-zA-Z.+-]/.test(text[i]))
        fail('รูปแบบตัวเลขไม่ถูกต้อง — ห้ามนำหน้าด้วย 0 และต้องมีตัวเลขหลังจุดทศนิยม')
      return
    }

    if (ch === "'") fail("JSON ต้องใช้เครื่องหมาย \" ไม่ใช่ '")
    fail(`ไม่คาดคิดว่าจะพบ '${ch}'`)
  }

  const object = () => {
    i++ // {
    skipWs()
    if (text[i] === '}') return i++
    while (true) {
      skipWs()
      if (eof()) fail('ข้อมูลจบก่อนกำหนด — อ็อบเจ็กต์ยังไม่ถูกปิดด้วย }')
      if (text[i] !== '"') fail(`ชื่อคีย์ต้องอยู่ในเครื่องหมาย " แต่พบ '${text[i]}'`)
      string()
      expect(':', "':' หลังชื่อคีย์")
      value()
      skipWs()
      if (eof()) fail('ข้อมูลจบก่อนกำหนด — อ็อบเจ็กต์ยังไม่ถูกปิดด้วย }')
      if (text[i] === ',') {
        i++
        skipWs()
        if (text[i] === '}') fail('มีเครื่องหมาย , เกินก่อนปิด }', i - 1)
        continue
      }
      if (text[i] === '}') return i++
      fail(`ต้องการ ',' หรือ '}' แต่พบ '${text[i]}'`)
    }
  }

  const array = () => {
    i++ // [
    skipWs()
    if (text[i] === ']') return i++
    while (true) {
      value()
      skipWs()
      if (eof()) fail('ข้อมูลจบก่อนกำหนด — อาร์เรย์ยังไม่ถูกปิดด้วย ]')
      if (text[i] === ',') {
        i++
        skipWs()
        if (text[i] === ']') fail('มีเครื่องหมาย , เกินก่อนปิด ]', i - 1)
        continue
      }
      if (text[i] === ']') return i++
      fail(`ต้องการ ',' หรือ ']' แต่พบ '${text[i]}'`)
    }
  }

  return {
    eof,
    skipWs,
    readValue: value,
    get pos() {
      return i
    },
    advance() {
      i++
    },
  }
}

// แยกข้อความออกเป็นค่า JSON ทีละก้อน — คั่นด้วยช่องว่าง/ขึ้นบรรทัดใหม่ หรือ , หรือ ;
// (รองรับ NDJSON, อ็อบเจ็กต์ที่ก๊อปมาต่อกัน, และรายการที่คั่นด้วยจุลภาคแต่ลืมครอบ [])
export function scanDocuments(text) {
  const s = createScanner(text)
  const parts = []

  try {
    s.skipWs()
    while (!s.eof()) {
      const start = s.pos
      s.readValue()
      parts.push({ start, end: s.pos })

      s.skipWs()
      if (!s.eof() && (text[s.pos] === ',' || text[s.pos] === ';')) {
        s.advance()
        s.skipWs()
      }
    }
    if (parts.length === 0) return { parts, error: { index: 0, message: 'ไม่พบค่า JSON' } }
    return { parts, error: null }
  } catch (e) {
    if (e && typeof e.index === 'number') return { parts, error: e }
    throw e
  }
}

export function lineColumnAt(text, index) {
  const upto = text.slice(0, index)
  const lines = upto.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}
