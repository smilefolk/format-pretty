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
    sortKeys={false} setSortKeys={noop} mergeChunks={true} setMergeChunks={noop}
    view="code" setView={noop} notify={noop} />
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
ตัวเลือก `parseJson(text, { merge = true })` — `merge:false` แล้วพบหลายก้อนจะคืน error ชี้ต้นก้อนที่ 2 แทนการรวม
(Formatter ส่ง `doc.mergeChunks`; Compare / `unwrap.js` / DocTabs ของ doc อื่นเรียกแบบ default)

### `src/lib/locate.js` — JSON scanner ที่เขียนเอง

มีอยู่เพราะข้อความ error ของ `JSON.parse` ไม่บอกตำแหน่งในหลายกรณี (V8 คืน
`Unexpected token ',', ..."..." is not valid JSON` เฉย ๆ ไม่มี position) จึงต้องมี recursive-descent
scanner ของตัวเองเพื่อ (1) ระบุ index ของจุดที่ผิดจริง (2) หาขอบเขตของค่า JSON แต่ละก้อนเพื่อรวม
NDJSON / อ็อบเจ็กต์ที่ต่อกันให้เป็น array — `scanDocuments()` คือจุดที่ทำเรื่องนี้

### ไลบรารีที่ต่อยอดจาก `parseJson`

- `src/lib/diff.js` — เทียบ JSON สองก้อนแบบ recursive คืนรายการ `{ path, type, left, right }`
  โดย `type` เป็น `added` / `removed` / `changed` / `type` (+ `equal` เฉพาะใบเมื่อ `includeEqual`)
  `diffJson(a, b, { arrayKey, includeEqual })` — อาร์เรย์เทียบตาม index เป็นค่าเริ่มต้น; ส่ง `arrayKey`
  เพื่อจับคู่ด้วยค่าคีย์ (path `$.items[id=7]` / `$.items[sku="X1"]`) อาร์เรย์ที่จับคู่ไม่ได้ fallback เป็น index
  เฉพาะอาร์เรย์นั้น — `diffJsonWithMeta()` คืน `{ diffs, fallbacks }` ให้ UI แสดง notice;
  `countKeys()` นับใบที่ตรงกัน/รวม สำหรับการ์ดสรุป; `summarize()` / `toReport()` ไม่นับ `equal`
- `src/lib/unwrap.js` — แกะ JSON ที่ถูก escape เป็นสตริง ทีละชั้นสูงสุด 12 ชั้น รองรับทั้งแบบมีและ
  ไม่มีเครื่องหมายคำพูดครอบ ส่วน `unwrapNested()` แกะสตริง JSON ที่ซ่อนอยู่ในฟิลด์ย่อย

### State ของเนื้อหาอยู่ใน "เอกสาร" (`src/lib/docs.js` + `src/hooks/useDocs.js`)

`App` ถือ `docs[]` + `activeId` ผ่าน `useDocs()` — หนึ่ง tab = เอกสารของเครื่องมือหนึ่ง (`doc.tool` เป็น
`format` / `compare` / `unwrap`) เนื้อหา (`input`, `left`/`right`) และตัวเลือก (`indent`, `sortKeys`, `view`,
`mergeChunks`, `deep`, `repeat`, `strategy`, `arrayKey`, `showEqual`) เป็นของแต่ละ doc `App` ส่งลงหน้าเป็น
props รูป `value` / `setValue` (setter = `update(doc.id, { key })`) หน้าใน `src/pages/` จึงไม่ควรเก็บ state
ของอินพุตเอง (state เฉพาะ UI เช่นตัวกรอง เก็บในหน้าได้) แต่ละหน้าถูก `key={doc.id}` ให้ได้ instance ใหม่ต่อ doc

reducer ใน `lib/docs.js` เป็น pure function ทดสอบด้วย node ได้ตรง ๆ; persist ลง `localStorage['fp-docs']`
(debounce 300 ms, doc ที่เนื้อหารวม > 1 MB เก็บแต่ metadata + ธง `tooLarge`) อยู่ใน hook เท่านั้น
state ระดับแอปที่ไม่อยู่ต่อเอกสาร: `theme` (`fp-theme`), `lang` (`fp-lang`), `toast`

เครื่องมือที่แสดงคือ `doc.tool` ของ doc ที่ active — คลิก rail = กลับไป doc ล่าสุดของเครื่องมือนั้น
(`openTool`) หรือสร้างใหม่ถ้ายังไม่มี; `sendToFormatter` = เปิด doc `format` ใหม่พร้อมเนื้อหา

เครื่องมือใหม่ = เพิ่มไฟล์ใน `src/pages/` + เพิ่มใน `TOOLS` (`components/shell/ToolRail.jsx`) และ
`DOC_TOOLS` (`lib/docs.js`) + เพิ่มบล็อก `{doc.tool === '<ชื่อ>' && …}` ใน `App.jsx`

### Shell (`src/components/shell/`)

`AppShell` = TopBar (brand · `DocTabs` · ⌘K · TH/EN · ธีม) / ToolRail 56px · เนื้อหา · options 236px /
StatusStrip หน้าส่งเนื้อหาเข้า options panel และ status strip ผ่าน portal slot
`<OptionsSlot>` / `<StatusSlot>` (`shell/slots.jsx`) — ตอน SSR ไม่มี container จะเรนเดอร์ว่าง ไม่พัง
label สองภาษาใช้ `<L th en />` จาก `src/lib/i18n.jsx` (โหมด `en` ซ่อน sub-label)

### คอมโพเนนต์ที่ใช้ร่วมกัน (`src/components/`)

`Editor` (textarea + เลขบรรทัด + ไฮไลต์บรรทัดที่ผิด + drag & drop ไฟล์; `ref.focusLine(n)`, prop `dense` / `wrap`),
`CodeView` (ระบายสีด้วย `tokenize()` จาก `json.js`), `JsonTree` (มุมมองพับ/ขยาย), `ErrorCard` (การ์ด error
ใต้ source pane: chip line:column + ปุ่มไปที่บรรทัด) — ตัวเลือก indent/view ที่ใช้ร่วมกันอยู่ใน `lib/constants.js`

หน้าที่ redesign แล้วเรนเดอร์ชิดขอบ (Formatter ใน `.workbench`, Compare ใน `.compare-page`); หน้าที่ยังเป็นการ์ด
แบบเดิม (Unwrap) ห่อด้วย `<div className="legacy-page">` ซึ่งถือ padding ไว้แทน `.shell-content` — ลบทิ้งเมื่อทุกหน้า redesign ครบ

## Conventions

- ข้อความ UI และคอมเมนต์เป็นภาษาไทยทั้งหมด รวมถึงข้อความ error ที่ผู้ใช้เห็น
- สไตล์อยู่ใน `src/styles.css` ไฟล์เดียว ใช้ CSS variable ล้วน ไม่มี CSS framework
  ธีมสลับด้วย `document.documentElement.dataset.theme` (`dark` / `light`) — สีใหม่ทุกสีต้อง
  ประกาศทั้งใน `:root` และ `:root[data-theme='light']`
- ห้ามเพิ่ม dependency ถ้าเลี่ยงได้ ทุกอย่างทำงานฝั่งเบราว์เซอร์ ไม่มีการส่งข้อมูลออกนอกเครื่อง
