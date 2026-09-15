# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server บน http://localhost:5173 (เปิดเบราว์เซอร์ให้อัตโนมัติ)
npm run build    # build ไป dist/
npm run preview  # เสิร์ฟ dist/ ที่ build แล้ว

node scripts/check-lib.mjs    # node test ของ src/lib (json / diff / unwrap / fix / commands / docs) ไม่ต้องเปิดเบราว์เซอร์
python3 scripts/check-css.py  # ทุก class selector ใน styles.css ต้องมี JSX ใช้ (กัน CSS ตาย)
```

ไม่มี linter และไม่มี test runner ติดตั้งไว้ — สคริปต์ใน `scripts/` ใช้แค่ node/python ที่มีอยู่แล้ว ไม่เพิ่ม dependency

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

- props ของแต่ละหน้า: `Formatter` ตามข้างบน; `Compare` = `left setLeft right setRight strategy setStrategy arrayKey
  setArrayKey showEqual setShowEqual notify`; `Unwrap` = `input setInput indent setIndent view setView deep setDeep
  notify sendToFormatter`; `<App />` เรนเดอร์ได้ทั้งตัว (ไม่มี localStorage ก็ไม่พัง)
- options panel / status strip ของหน้าเรนเดอร์ผ่าน portal → ตอน SSR จะ **ไม่มี** ใน HTML (ต้องดูในเบราว์เซอร์);
  `CommandPalette` เรนเดอร์ได้ตรง ๆ ด้วย `<CommandPalette open onClose={noop} ctx={…} />`
- ทดสอบโหมดอังกฤษ: ครอบด้วย `<LangContext.Provider value="en">` จาก `src/lib/i18n`
- ข้อควรระวังตอนเขียน assertion: `renderToString` แทรก `<!-- -->` ระหว่าง text node และ escape `"`
  เป็น `&quot;` ดังนั้นให้ strip ทั้งสองอย่างก่อนค้นข้อความ; `<textarea>` ใน SSR ว่างเสมอ (Editor เป็น uncontrolled
  แล้ว sync ค่าเองตอน mount) — อย่า assert เนื้อหา textarea จาก SSR

ส่วน `src/lib/*.js` ทดสอบตรง ๆ ด้วย node ได้ (`scripts/check-lib.mjs` ทำให้แล้ว) ถ้าจะเขียนเทสต์ชั่วคราวเอง
ต้องแก้ import ให้มีนามสกุล `.js` ก่อน เพราะโค้ดจริงพึ่งการ resolve ของ vite เช่น
`sed "s|from './locate'|from './locate.js'|" src/lib/json.js > /tmp/json.js`

ตรวจในเบราว์เซอร์: `npm run dev` แล้วเทียบกับ mock ใน handoff (`2a` Formatter / `3a` Diff / `3b` Unwrap / `3c` ⌘K);
ก่อน merge ที่แตะ token สี ให้รัน axe หรือ Lighthouse accessibility (เป้าหมาย 100 — เหลือได้แค่เลขบรรทัด ดู Conventions)

## Architecture

เว็บแอปหน้าเดียว ไม่มี backend ไม่มี router และไม่มี dependency นอกจาก `react` / `react-dom`
(syntax highlighting, tree view, JSON parser, diff, command palette ทั้งหมดเขียนเอง) ฟอนต์ self-host ใน `public/fonts`
— ไม่มี request ออกนอกเครื่องเลย และต้องคงไว้แบบนี้

ดีไซน์คือ "Workbench" (handoff option 2a): shell เต็ม viewport, แท็บเอกสารหลายอัน, panel ตัวเลือกด้านขวา,
label สองภาษา (ไทยหลัก + อังกฤษ mono ตัวเล็ก), ⌘K

### Shell (`src/components/shell/`)

`AppShell` = `TopBar` (brand · `DocTabs` (จุดสถานะ parse เองต่อ doc; doc > 256 KB คิดใหม่หลังหยุดพิมพ์ 400 ms) · ปุ่ม ⌘K · `LangSwitch` TH/EN · ธีม) / `ToolRail` 56px · เนื้อหา ·
options 236px (`OptionsPanel` + `OptionGroup`; < 1120px กลายเป็น `OptionsDrawer` — เฟรม mock 1120 ยังเห็น panel) / `StatusStrip`
หน้าใน `src/pages/` ส่งเนื้อหาเข้า options panel และ status strip ผ่าน portal slot `<OptionsSlot>` / `<StatusSlot>`
(`shell/slots.jsx`) — ไม่ lift state ขึ้น App; ตอน SSR ไม่มี container จะเรนเดอร์ว่าง ไม่พัง

label สองภาษาใช้ `<L th en />` และ `useT()` จาก `src/lib/i18n.jsx` — โหมด `th` แสดงไทย + sub-label อังกฤษ,
โหมด `en` แสดงอังกฤษล้วน (persist `fp-lang`) ข้อความที่เป็นสตริงล้วน (placeholder, aria-label, toast) ใช้ `t(th, en)`

### State อยู่ใน "เอกสาร" (`src/lib/docs.js` + `src/hooks/useDocs.js`)

`App` ถือ `docs[]` + `activeId` ผ่าน `useDocs()` — หนึ่ง tab = เอกสารของเครื่องมือหนึ่ง (`doc.tool` เป็น
`format` / `compare` / `unwrap`, D1) เนื้อหา (`input`, `left`/`right`) และตัวเลือกทั้งหมด (`indent`, `sortKeys`, `view`,
`mergeChunks`, `deep`, `strategy`, `arrayKey`, `showEqual`) เป็นของแต่ละ doc (D8 — `indent`/`view` ไม่แชร์
ระหว่างเครื่องมือแล้ว) `App` ส่งลงหน้าเป็น props รูป `value` / `setValue` (setter = `update(doc.id, { key })`)
หน้าจึงไม่เก็บ state ของอินพุต/ตัวเลือกเอง (state เฉพาะ UI เช่นตัวกรอง/คำค้นในหน้า Diff เก็บในหน้าได้)
แต่ละหน้าถูก `key={doc.id}` ให้ได้ instance ใหม่ต่อ doc

reducer ใน `lib/docs.js` เป็น pure function ทดสอบด้วย node ได้ตรง ๆ; persist ลง `localStorage['fp-docs']`
(debounce 300 ms, doc ที่เนื้อหารวม > 1 MB เก็บแต่ metadata + ธง `tooLarge`, quota เต็มแจ้งครั้งเดียว) อยู่ใน hook เท่านั้น
state ระดับแอปที่ไม่อยู่ต่อเอกสาร: `theme` (`fp-theme`), `lang` (`fp-lang`), `toast`, `paletteOpen`

เครื่องมือที่แสดงคือ `doc.tool` ของ doc ที่ active — คลิก rail / ⌘K = reducer action `openTool`: กลับไป doc ล่าสุดของ
เครื่องมือนั้น (MRU) หรือสร้างใหม่ถ้ายังไม่มี ยกเว้น doc ที่ active ยังเปล่า (`isBlankDoc`: ไม่มีเนื้อหา + ชื่อ default) จะเปลี่ยน
`tool` ของ doc นั้นแทนเพื่อไม่ทิ้ง tab เปล่าไว้ (#67) — แต่ถ้า doc เปล่านั้นเป็น doc เดียวของเครื่องมือเดิม (rail สร้างให้เอง
ไม่ได้มาจากกด +) และเป้าหมายมี doc อยู่แล้ว ถือว่าเปลี่ยนใจกลับ → ไป doc นั้นตามปกติ; `sendToFormatter` = เปิด doc `format`
ใหม่ชื่อ "จาก unwrap" พร้อมเนื้อหา

### หน้า (`src/pages/`)

ทุกหน้าเรนเดอร์ชิดขอบใน `.shell-content` ไม่มี toolbar ระดับหน้า — ปุ่มอยู่ใน action bar ใต้ pane (`.action-bar`)
ส่วนตัวเลือกอยู่ใน options panel และตัวเลขสถานะอยู่ใน status strip

- `Formatter` — `.workbench` grid 1fr 1fr: source (Editor + `ErrorCard` + action bar จัดรูปแบบ/ย่อ/เปิดไฟล์/ล้าง) ·
  output (Badge + คัดลอก/ดาวน์โหลดในหัว + CodeView/JsonTree + แถบล่างมีแต่ meta บรรทัด·ไบต์ เพื่อให้สูงเท่าฝั่ง source —
  `.action-bar` มี `min-height: 50px` ทุกแถบจึงเท่ากันไม่ว่ามีปุ่มหรือไม่); panel: indent / sortKeys / mergeChunks / view / StatGrid
- `Compare` — `.compare-page`: แถวอินพุต 154px (Editor `dense` ×2, สลับซ้าย–ขวา) · header (Badge จำนวน, ค้นหา path,
  คัดลอกรายงาน) · แถว diff คอลัมน์คงที่ (คลิก/Enter คัดลอก path); panel: ตัวกรอง / strategy index|key + ชื่อคีย์ /
  showEqual / การ์ดสรุป; วางสองก้อนในช่องซ้ายช่องเดียว = autoSplit
- `Unwrap` — `.workbench`: Editor `wrap` + การ์ด chain "ชั้นที่แกะได้" + action bar (แกะสตริง ⌘↵ = เขียนผลทับช่องซ้าย
  ตาม D5, ตัวอย่าง, ล้าง) · ผลลัพธ์ + แถบล่างส่งไปหน้าจัดรูปแบบ; panel: deep / indent / view / StatGrid

### Action และ command palette (`src/hooks/useActions.js` + `src/lib/commands.js`)

หน้าไม่เขียน handler เอง — เรียก `useFormatterActions()` / `useCompareActions()` / `useUnwrapActions()` ด้วย
result/output ที่หน้าถืออยู่ แล้วได้ object ของ action (`format`, `minify`, `copy`, …) ไปผูกปุ่ม จากนั้น
`usePublishActions(actions)` ลงทะเบียนเข้า `ActionsContext` (ref ที่ `App` ถือ ไม่ re-render) — ⌘K
(`components/CommandPalette.jsx`) เรียก `listCommands(ctx)` จาก `lib/commands.js` ซึ่ง `run(ctx)` ไปเรียก
`ctx.actions.<ชื่อ>` **ตัวเดียวกับปุ่ม** จึงไม่มี logic ซ้ำสองที่ helper ร่วม (`copyText`, `downloadText`,
`readTextFile(file, onText(text, fileName), notify)`) ก็อยู่ในไฟล์นี้; `<input type="file">` ที่ซ่อนอยู่มาจาก
`hooks/useFilePicker.jsx` (`{ open, input }`) — Formatter/Unwrap มีปุ่มเปิดไฟล์ + ⌘K, Compare มีแค่ลากวาง + ⌘K
(ซ้าย/ขวา) ตาม mock; ไฟล์ที่เปิดลง doc ที่ยังชื่อ "เอกสาร n" จะตั้งชื่อ tab ตามไฟล์ (`App.onFileName` →
`isDefaultName` ใน `lib/docs.js`; reducer `rename` กันชื่อซ้ำด้วย ` (2)`)

คำสั่ง = `{ id, th, en, group, glyph, keys?, when?(ctx), run(ctx), state?(ctx) → 'เปิดอยู่' | null }` กลุ่ม
เอกสาร / ตั้งค่า / เครื่องมือ / ทั่วไป; `when` ซ่อนตามเครื่องมือ (เช่น `fix` โชว์เฉพาะเมื่อ `actions.fix` มีค่า);
คำสั่งสลับเอกสารสร้าง dynamic จาก `docs`; `ctx` สร้างใน `App` (`commandCtx`: doc, docs, actions (getter อ่าน ref สด
เพราะหน้าลงทะเบียนหลัง App render), set, openTool, newDoc, closeDoc, activateDoc, theme, toggleTheme, lang, setLang)
`rankCommands(commands, q, { lang, recent })` ให้คะแนน ขึ้นต้นข้อความ 3 / ขึ้นต้นคำ 2 (ขอบเขตคำไทยจาก `Intl.Segmenter`) /
กลางคำ 1 → `{ primary, related }` (palette แสดง primary ในกลุ่มเดิม, related ในกลุ่ม "คำสั่งที่ใกล้เคียง"); เสมอกันเรียงตาม
น้ำหนักกลุ่มแล้วคำสั่งที่เพิ่งใช้ (MRU `localStorage['fp-recent-commands']` ≤ 6 — โชว์เป็นกลุ่ม "ล่าสุด" เมื่อยังไม่พิมพ์)
ตัวอย่างข้อมูลทุกหน้าอยู่ `lib/samples.js`
(D4: ตัวอย่างเรียกจาก ⌘K; หน้า Unwrap มีปุ่มสลับตัวอย่างด้วยตาม mock)

### ไลบรารี (`src/lib/`)

**`parseJson()` ใน `json.js` คือหัวใจ** — ทุกหน้า, `unwrap.js`, `fix.js` และจุดสถานะใน `DocTabs` เรียกตัวเดียวกัน
และคาดหวัง shape นี้ (ถ้าจะแก้ต้องไล่ทุกที่):

- `{ ok: true, value, merged }` — `merged` > 1 แปลว่าอินพุตมี JSON หลายก้อนต่อกันแล้วถูกรวมเป็น array
- `{ ok: false, empty: true }` — อินพุตว่าง
- `{ ok: false, error: { message, line, column } }` — ข้อความ error เป็นภาษาไทย (`line`/`column` อาจไม่มี
  ถ้า scanner ของเราไม่เจอแล้วใช้ข้อความจากเบราว์เซอร์แทน)

ลำดับการทำงาน: ลอง `JSON.parse` ทั้งก้อนก่อน (ทางเร็ว) → ถ้าไม่ผ่านค่อยเรียก `scanDocuments()` ใน `locate.js`
ตัวเลือก `parseJson(text, { merge = true })` — `merge:false` แล้วพบหลายก้อนจะคืน error ชี้ต้นก้อนที่ 2 แทนการรวม
(Formatter ส่ง `doc.mergeChunks`; ที่อื่นเรียกแบบ default)

- `locate.js` — recursive-descent scanner ที่เขียนเอง เพราะข้อความ error ของ `JSON.parse` ไม่บอกตำแหน่งในหลายกรณี
  (V8 คืน `Unexpected token ',', ..."..." is not valid JSON` เฉย ๆ) ใช้ (1) ระบุ index ของจุดที่ผิดจริง
  (2) หาขอบเขตของค่า JSON แต่ละก้อนเพื่อรวม NDJSON / อ็อบเจ็กต์ที่ต่อกัน — `scanDocuments()`
- `diff.js` — `diffJson(a, b, { arrayKey, includeEqual })` คืนรายการ `{ path, type, left, right }` โดย `type` เป็น
  `added` / `removed` / `changed` / `type` (+ `equal` เฉพาะใบเมื่อ `includeEqual`); อาร์เรย์เทียบตาม index เป็นค่าเริ่มต้น
  ส่ง `arrayKey` เพื่อจับคู่ด้วยค่าคีย์ (path ตาม D6 `$.items[id=7]` / `$.items[sku="X1"]`) อาร์เรย์ที่จับคู่ไม่ได้
  (มี primitive/คีย์หาย/คีย์ซ้ำ) fallback เป็น index เฉพาะอาร์เรย์นั้น — `diffJsonWithMeta()` คืน `{ diffs, fallbacks }`
  ให้ UI แสดง notice; `countKeys()` นับใบ (leaf path) ที่ตรงกัน/รวม — การ์ดสรุปจึงเขียนว่า "ค่าที่ตรงกัน · ค่ารวม" (เคาะใน #55);
  `summarize()` / `toReport()` ไม่นับ `equal`
- `unwrap.js` — `unwrapJson()` แกะ JSON ที่ถูก escape เป็นสตริงทีละชั้น ≤ 12 ชั้น รองรับทั้งแบบมีและไม่มีเครื่องหมายคำพูดครอบ
  คืน `layers` (ตัวเลข) + `peels[{ n, where:'string' }]`; `unwrapNested(value)` แกะสตริง JSON ในฟิลด์ย่อยจนสุดในรอบเดียว
  (ทั้งสตริง→อ็อบเจ็กต์แบบ recursive และสตริง→สตริงที่ escape ซ้อน ≤ 8 ชั้นต่อฟิลด์ — เกินนั้นคืนค่าเดิม ไม่ทำลายข้อมูล)
  คืน `{ value, count, fields[{ path, depth }] }` — เคาะใน #56 ว่าไม่มี toggle "แกะซ้ำ" แล้ว
- `fix.js` — `fixJson(text)` แก้ JSON แบบกลไกจากตำแหน่ง error ของ `parseJson` (จุลภาคท้าย / จุลภาคซ้ำ / single quote /
  คีย์ไม่มี quote) re-parse ยืนยันทุกรอบ ≤ 5 รอบ คืน `{ fixed, applied[] }` หรือ `null` — ห้ามคืนข้อความที่ parse ไม่ผ่าน;
  Formatter โชว์ปุ่ม "แก้ให้อัตโนมัติ" เฉพาะเมื่อได้ผล (input ≤ 256 KB) และไม่ apply เอง (D7)
- `path.js` — `childPath(path, key)` สร้าง path `$.a[0]["k y"]` ใช้ร่วมกันใน `diff.js` (root `$`) และ `unwrap.js` (root `''`)
- `docs.js` / `commands.js` / `samples.js` / `constants.js` (`INDENT_OPTIONS`, `VIEW_OPTIONS`) / `i18n.jsx` — ดูข้างบน

### คอมโพเนนต์ที่ใช้ร่วมกัน (`src/components/`)

- `Editor` — textarea **uncontrolled** (React controlled เขียน text content ทั้งก้อนทุก render) sync `value` ลง DOM เอง
  เมื่อเปลี่ยนจากภายนอก; เกิน 512 KB หรือ 8,000 บรรทัด → โหมดตัวอย่าง (แสดง 64 KB แรก `readOnly` + แถบแจ้ง) เพราะ
  `<textarea>` ของเบราว์เซอร์ layout ทั้งก้อนทุกคีย์ (~20 µs/บรรทัด) — ผลลัพธ์/คัดลอก/ดาวน์โหลดยังใช้ทั้งก้อน;
  + เลขบรรทัด (gutter `aria-hidden`) + ไฮไลต์บรรทัดที่ผิด + drag & drop ไฟล์ (กรอบ dashed ระหว่างลาก);
  `ref.focusLine(n)` (ปุ่ม "ไปที่บรรทัด"), prop `dense` (Diff) / `wrap` (Unwrap) / `label` (aria-label — ต้องส่งเสมอ)
- `CodeView` (ระบายสีด้วย `tokenize()` จาก `json.js`; เกิน 2,000 บรรทัดเรนเดอร์เฉพาะบรรทัดที่มองเห็น — tokenize ต่อบรรทัด
  ให้ผลเท่ากับทั้งก้อนเพราะสตริง JSON ข้ามบรรทัดไม่ได้), `JsonTree` (พับ/ขยาย, pill นับรายการตาม lang; prop `unwrapped` =
  path แบบ `lib/path.js` root `''` ของโหนดที่เดิมเป็นสตริง JSON → ติด pill "สตริง" — Formatter มุมมองโครงสร้างส่ง
  `unwrapNested(value)` ให้ (#72, ข้ามเมื่อ input > 256 KB) โค้ด/คัดลอก/สถิติยังใช้ข้อมูลจริง; Unwrap ส่ง `nested.fields`)
- `ErrorCard` — การ์ด error แบบ 1b `{ title, message, line, column, onGoTo, onFix, children }` `role="alert"`;
  Formatter วางใต้ source pane, Unwrap วางในฝั่งผลลัพธ์พร้อม `<pre class="peeled">`
- `CommandPalette` — ⌘K (ดูส่วน Action)
- `ui/` primitives: `Badge` (`ok` / `danger` / `neutral` + ชนิด diff), `IconButton`, `KeyCap`, `PaneHead`, `Segmented`
  (radiogroup + ลูกศร), `StatGrid`, `Toggle` (`aria-pressed`)

### เพิ่มเครื่องมือใหม่

เพิ่มไฟล์ใน `src/pages/` (ใช้ `OptionsSlot`/`StatusSlot`, primitives ใน `ui/`, `Editor` พร้อม `label`) + เพิ่มใน `TOOLS`
(`shell/ToolRail.jsx`) และ `DOC_TOOLS` + ฟิลด์ตัวเลือกใน `DOC_DEFAULTS` (`lib/docs.js`) + บล็อก `{doc.tool === '<ชื่อ>' && …}`
ใน `App.jsx` + hook action ใน `hooks/useActions.js` + คำสั่งใน `lib/commands.js` + ตัวอย่างใน `lib/samples.js`

## การตัดสินใจด้านดีไซน์ (D1–D8 ใน issue #3, เคาะแล้ว)

D1 ทุกเครื่องมือมี tab เอกสาร (doc มี `tool`) · D2 ฟอนต์ self-host ใน `public/fonts` (OFL) ไม่ใช้ Google Fonts ·
D3 `sortKeys` default ปิด (เรียงคีย์เปลี่ยนลำดับข้อมูลผู้ใช้) · D4 ปุ่ม "ตัวอย่าง" ไปอยู่ใน ⌘K (Unwrap คงปุ่มตาม mock) ·
D5 "แกะสตริง ⌘↵" เขียนผลทับช่องซ้าย · D6 path จับคู่ด้วยคีย์ = `$.items[id=7]` · D7 auto-fix ทำท้ายสุดและไม่ auto-apply ·
D8 `indent`/`view` แยกต่อเอกสาร งานตามหลังนอก epic อยู่ใน issue #52–#59

## Conventions

- ข้อความ UI และคอมเมนต์เป็นภาษาไทยทั้งหมด รวมถึงข้อความ error ที่ผู้ใช้เห็น; label ที่มีคู่อังกฤษใช้ `<L>` / `t()`
- สไตล์อยู่ใน `src/styles.css` ไฟล์เดียว ใช้ CSS variable ล้วน ไม่มี CSS framework ห้าม hardcode สีในกฎ —
  ธีมสลับด้วย `document.documentElement.dataset.theme` (`dark` / `light`) สีใหม่ทุกสีต้องประกาศทั้งใน `:root`
  และ `:root[data-theme='light']` (alias ที่อ้าง token อื่นเช่น `--diff-*` ประกาศครั้งเดียวได้) token ตามตาราง
  ใน handoff README; ธีมสว่างเป็นค่าที่ตีความเองและปรับให้ผ่าน contrast แล้ว
- Contrast (ตัดสินใจใน #37): ข้อความทุกอย่างที่ไม่ใช่ "เสริม" ต้อง ≥ 4.5:1 บนพื้นของมันทั้งสองธีม —
  `--muted-2` / `--muted-3` ถูกยกจาก spec (3.9 / 3.2:1) เป็น `#7f848d` / `#7a7f88` (dark);
  ยกเว้นโดยตั้งใจ: เลขบรรทัด (`--faint`, gutter เป็น `aria-hidden`) และ placeholder (`--disabled`) ~2:1
  ข้อความบน `--panel-2` (pill/chip/badge neutral) ต้องใช้ `--muted-2` ขึ้นไป ไม่ใช่ `--muted-3` (4.4:1 ไม่ถึง)
  ตรวจด้วย axe/Lighthouse ก่อน merge ทุกครั้งที่แตะ token
- Accessibility: ทุกจุดที่โต้ตอบได้ต้องมี focus ring (global `:focus-visible` มินต์ — อย่าใส่ `outline: none` ยกเว้นมี
  การแสดง focus แบบอื่นแทน เช่น `.editor:focus-within`), ปุ่มไอคอนต้องมี `aria-label` ที่ขึ้นต้นด้วยข้อความที่มองเห็น,
  `role="tab"` ห้ามมี interactive ซ้อน (ปุ่ม × เป็น `aria-hidden` และมี Delete/F2 แทน), toast อยู่ใน live region ถาวร
- ห้ามเพิ่ม dependency ถ้าเลี่ยงได้ ทุกอย่างทำงานฝั่งเบราว์เซอร์ ไม่มีการส่งข้อมูลออกนอกเครื่อง (ฟอนต์ self-host,
  ไม่มี analytics) — ตรวจด้วย DevTools Network ว่าไม่มี request ออกนอก origin
- โค้ดไม่ได้จัดรูปแบบด้วย prettier สม่ำเสมอ: ไฟล์ใหม่จัดด้วย `--no-semi --single-quote --print-width 100
  --trailing-comma es5` ได้ แต่อย่า `--write` ทับไฟล์เดิม (diff จะปนกับการจัดรูปแบบ) แตะเฉพาะบรรทัดที่เกี่ยว
