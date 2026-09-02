# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server บน http://localhost:5173 (เปิดเบราว์เซอร์ให้อัตโนมัติ)
npm run build    # build ไป dist/
npm run preview  # เสิร์ฟ dist/ ที่ build แล้ว
```

ไม่มี linter และไม่มี test runner ติดตั้งไว้

## Verifying changes

`npm run build` จับได้แค่ syntax error เท่านั้น วิธีตรวจ runtime error โดยไม่ต้องเปิดเบราว์เซอร์คือ bundle
แล้ว server-render คอมโพเนนต์ด้วย esbuild (มาพร้อม vite อยู่แล้ว) — ไฟล์ทดสอบต้องวางไว้ใน root ของโปรเจกต์
เพื่อให้ resolve `node_modules` ได้:

```bash
cat > ./__check.jsx <<'JSX'
import { renderToString } from 'react-dom/server.browser'
import Formatter from './src/pages/Formatter'
const noop = () => {}
const html = renderToString(
  <Formatter input={'{"id":1}\n{"id":2}'} setInput={noop} indent="2" setIndent={noop}
    sortKeys={false} setSortKeys={noop} view="code" setView={noop} notify={noop} />
)
console.log(html.replace(/<!-- -->/g, '').includes('รวมเป็นอาร์เรย์เดียวให้แล้ว'))
JSX
npx esbuild ./__check.jsx --bundle --platform=node --format=esm --jsx=automatic \
  --loader:.css=empty --outfile=/tmp/check.mjs --log-level=error && node /tmp/check.mjs
rm -f ./__check.jsx
```

ข้อควรระวังตอนเขียน assertion: `renderToString` แทรก `<!-- -->` ระหว่าง text node และ escape `"`
เป็น `&quot;` ดังนั้นให้ strip ทั้งสองอย่างก่อนค้นข้อความ

ส่วน `src/lib/*.js` ทดสอบตรง ๆ ด้วย node ได้ แต่ต้องแก้ import ให้มีนามสกุล `.js` ก่อน (โค้ดจริงพึ่ง
การ resolve ของ vite) เช่น `sed "s|from './locate'|from './locate.js'|" src/lib/json.js > /tmp/json.js`

## Architecture

เว็บแอปหน้าเดียว ไม่มี backend ไม่มี router และไม่มี dependency นอกจาก `react` / `react-dom`
(syntax highlighting, tree view, JSON parser ทั้งหมดเขียนเอง)

### หัวใจของระบบคือ `parseJson()` ใน `src/lib/json.js`

ทุกหน้าเรียกใช้ฟังก์ชันนี้ตัวเดียวกัน และคาดหวัง shape นี้:

- `{ ok: true, value, merged }` — `merged` > 1 แปลว่าอินพุตมี JSON หลายก้อนต่อกันแล้วถูกรวมเป็น array
- `{ ok: false, empty: true }` — อินพุตว่าง
- `{ ok: false, error: { message, line, column } }` — ข้อความ error เป็นภาษาไทย

ถ้าจะแก้ shape นี้ ต้องไล่แก้ทั้ง 3 หน้า เพราะทุกหน้าอ่าน `result.error?.line` ไปไฮไลต์บรรทัด
และอ่าน `result.merged` ไปแสดงแถบแจ้งเตือน

ลำดับการทำงาน: ลอง `JSON.parse` ทั้งก้อนก่อน (ทางเร็ว) → ถ้าไม่ผ่านค่อยเรียก `scanDocuments()`

### `src/lib/locate.js` — JSON scanner ที่เขียนเอง

มีอยู่เพราะข้อความ error ของ `JSON.parse` ไม่บอกตำแหน่งในหลายกรณี (V8 คืน
`Unexpected token ',', ..."..." is not valid JSON` เฉย ๆ ไม่มี position) จึงต้องมี recursive-descent
scanner ของตัวเองเพื่อ (1) ระบุ index ของจุดที่ผิดจริง (2) หาขอบเขตของค่า JSON แต่ละก้อนเพื่อรวม
NDJSON / อ็อบเจ็กต์ที่ต่อกันให้เป็น array — `scanDocuments()` คือจุดที่ทำเรื่องนี้

### ไลบรารีที่ต่อยอดจาก `parseJson`

- `src/lib/diff.js` — เทียบ JSON สองก้อนแบบ recursive คืนรายการ `{ path, type, left, right }`
  โดย `type` เป็น `added` / `removed` / `changed` / `type` — **อาร์เรย์จับคู่ตาม index ไม่ใช่ตามคีย์**
- `src/lib/unwrap.js` — แกะ JSON ที่ถูก escape เป็นสตริง ทีละชั้นสูงสุด 12 ชั้น รองรับทั้งแบบมีและ
  ไม่มีเครื่องหมายคำพูดครอบ ส่วน `unwrapNested()` แกะสตริง JSON ที่ซ่อนอยู่ในฟิลด์ย่อย

### State ทั้งหมดอยู่ที่ `src/App.jsx`

`App` เก็บ state ของทุกหน้าไว้เอง (`input`, `left`/`right`, `rawString`, `indent`, `view`, …) แล้วส่งลง
เป็น props — เพื่อให้สลับเมนูไปมาแล้วข้อความที่พิมพ์ไว้ไม่หาย หน้าใน `src/pages/` จึงไม่ควรเก็บ
state ของอินพุตเอง (state เฉพาะ UI เช่นตัวกรอง เก็บในหน้าได้)

`indent` และ `view` ใช้ร่วมกันระหว่างหน้า Formatter กับ Unwrap โดยตั้งใจ

หน้าใหม่ = เพิ่มไฟล์ใน `src/pages/` + เพิ่มรายการใน `MENU` + เพิ่มบล็อก `{page === '<ชื่อ>' && …}`
ใน `App.jsx`

### คอมโพเนนต์ที่ใช้ร่วมกัน (`src/components/`)

`Editor` (textarea + เลขบรรทัด + ไฮไลต์บรรทัดที่ผิด + drag & drop ไฟล์), `CodeView`
(ระบายสีด้วย `tokenize()` จาก `json.js`), `JsonTree` (มุมมองพับ/ขยาย)

## Conventions

- ข้อความ UI และคอมเมนต์เป็นภาษาไทยทั้งหมด รวมถึงข้อความ error ที่ผู้ใช้เห็น
- สไตล์อยู่ใน `src/styles.css` ไฟล์เดียว ใช้ CSS variable ล้วน ไม่มี CSS framework
  ธีมสลับด้วย `document.documentElement.dataset.theme` (`dark` / `light`) — สีใหม่ทุกสีต้อง
  ประกาศทั้งใน `:root` และ `:root[data-theme='light']`
- ห้ามเพิ่ม dependency ถ้าเลี่ยงได้ ทุกอย่างทำงานฝั่งเบราว์เซอร์ ไม่มีการส่งข้อมูลออกนอกเครื่อง
