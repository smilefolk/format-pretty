#!/usr/bin/env node
// สร้างรูปใน public/ จาก public/favicon.svg และ template ด้านล่าง ด้วย Chrome แบบ headless (ไม่เพิ่ม dependency)
//   favicon.ico (32 + 48 px), apple-touch-icon.png (180 px พื้นเต็ม — iOS ตัดมุมเอง), og-image.png (1200×630)
// รันใหม่เมื่อแก้โลโก้/ข้อความบนรูปแชร์: node scripts/render-images.mjs  (Chrome ที่อื่นตั้ง CHROME=/path/to/chrome)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// สีจาก token ธีมมืดใน src/styles.css (รูปเป็นไฟล์ static ใช้ var() ไม่ได้)
const C = {
  bg: '#08090b',
  panel: '#101216',
  border: '#23262e',
  text: '#eceae4',
  text2: '#c8ccd2',
  muted2: '#7f848d',
  faint: '#3d424a',
  accent: '#4fd6c0',
  key: '#7fd6a8',
  string: '#9ccdf5',
  number: '#f0b877',
  boolean: '#cbaaf5',
  null: '#ff8f84',
  punct: '#767b84',
}

const font = (file) =>
  `data:font/woff2;base64,${readFileSync(join(PUBLIC, 'fonts', file)).toString('base64')}`

const work = mkdtempSync(join(tmpdir(), 'fp-images-'))

function screenshot(html, width, height, transparent = false) {
  const page = join(work, 'page.html')
  const out = join(work, 'shot.png')
  writeFileSync(page, html)
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${width},${height}`,
    // ให้ฟอนต์ (data: URL) โหลดเสร็จก่อนถ่าย
    '--virtual-time-budget=3000',
    ...(transparent ? ['--default-background-color=00000000'] : []),
    `--screenshot=${out}`,
    pathToFileURL(page).href,
  ], { stdio: 'ignore' })
  const png = readFileSync(out)
  // ตรวจขนาดจาก IHDR — Chrome บางเวอร์ชันถ่ายไม่ตรง window-size
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)]
  if (w !== width || h !== height) throw new Error(`ได้รูป ${w}×${h} ไม่ใช่ ${width}×${height}`)
  return png
}

const svg = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8')
const page = (body, css = '') =>
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}${css}</style>${body}`

function icon(size, { fullBleed = false } = {}) {
  // พื้นเต็ม: ระบบตัดมุมเอง (apple-touch-icon) → ไม่ใส่มุมโค้งของ svg และไม่โปร่งใส
  const art = fullBleed ? svg.replace(/ rx="[^"]*"/, '') : svg
  return screenshot(
    page(art, `svg{display:block;width:${size}px;height:${size}px}`),
    size,
    size,
    !fullBleed
  )
}

// ICO ที่ฝัง PNG ตรง ๆ (รองรับทุกเบราว์เซอร์ปัจจุบัน): header 6 ไบต์ + entry 16 ไบต์ต่อรูป + ข้อมูล PNG
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((image) => image.png)])
}

// ตัวอย่าง JSON บนรูปแชร์ — [ข้อความ, ชนิด token] ต่อบรรทัด
const SAMPLE = [
  [['{', 'punct']],
  [['  "id"', 'key'], [': ', 'punct'], ['7', 'number'], [',', 'punct']],
  [['  "name"', 'key'], [': ', 'punct'], ['"FormatPritty"', 'string'], [',', 'punct']],
  [['  "valid"', 'key'], [': ', 'punct'], ['true', 'boolean'], [',', 'punct']],
  [['  "tags"', 'key'], [': [', 'punct'], ['"format"', 'string'], [', ', 'punct'], ['"diff"', 'string'], ['],', 'punct']],
  [['  "parent"', 'key'], [': ', 'punct'], ['null', 'null']],
  [['}', 'punct']],
]

function ogImage() {
  const code = SAMPLE.map(
    (tokens, i) =>
      `<div class="ln"><span class="no">${i + 1}</span>${tokens
        .map(([text, type]) => `<span style="color:${C[type]}">${text}</span>`)
        .join('')}</div>`
  ).join('')
  const css = `
    @font-face{font-family:Plex;font-weight:400;src:url(${font('IBMPlexSansThai-Regular.woff2')})}
    @font-face{font-family:Plex;font-weight:600;src:url(${font('IBMPlexSansThai-SemiBold.woff2')})}
    @font-face{font-family:Mono;font-weight:400;src:url(${font('JetBrainsMono-Regular.woff2')})}
    @font-face{font-family:Mono;font-weight:700;src:url(${font('JetBrainsMono-Bold.woff2')})}
    body{width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:${C.bg};
      color:${C.text};font-family:Plex;display:flex;align-items:center;gap:56px;overflow:hidden}
    .copy{flex:1;min-width:0}
    .brand{display:flex;align-items:center;gap:20px}
    .logo{width:68px;height:68px;border-radius:18px;background:${C.accent};display:grid;place-items:center}
    .logo svg{width:68px;height:68px}
    .name{font-weight:600;font-size:60px;letter-spacing:-1px;line-height:1}
    .th{margin-top:40px;font-size:34px;line-height:1.45;color:${C.text2}}
    .en{margin-top:14px;font:400 17px/1 Mono;letter-spacing:.08em;color:${C.muted2}}
    .note{margin-top:44px;display:flex;align-items:center;gap:12px;font-size:21px;color:${C.text2}}
    .dot{width:10px;height:10px;border-radius:50%;background:${C.accent}}
    .code{flex:none;width:450px;padding:26px 0;border:1px solid ${C.border};border-radius:14px;
      background:${C.panel};font:400 20px/1.8 Mono;white-space:pre}
    .ln{display:flex}
    .no{width:52px;padding-right:20px;text-align:right;color:${C.faint};flex:none}`
  const body = `
    <div class="copy">
      <div class="brand"><div class="logo">${svg}</div><div class="name">FormatPritty</div></div>
      <div class="th">จัดรูปแบบ · ตรวจสอบ · เปรียบเทียบ<br>และแกะสตริง JSON</div>
      <div class="en">FORMAT · VALIDATE · DIFF · UNESCAPE</div>
      <div class="note"><span class="dot"></span>ทำงานในเบราว์เซอร์ — ข้อมูลไม่ออกนอกเครื่อง</div>
    </div>
    <div class="code">${code}</div>`
  return screenshot(page(body, css), 1200, 630)
}

try {
  writeFileSync(
    join(PUBLIC, 'favicon.ico'),
    ico([32, 48].map((size) => ({ size, png: icon(size) })))
  )
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), icon(180, { fullBleed: true }))
  writeFileSync(join(PUBLIC, 'og-image.png'), ogImage())
  console.log('เขียน public/favicon.ico, apple-touch-icon.png, og-image.png แล้ว')
} finally {
  rmSync(work, { recursive: true, force: true })
}
