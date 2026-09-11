# แผนแตกงาน — ปรับ FormatPritty เป็น "Workbench" (design option 2a)

อ้างอิง handoff: `~/Downloads/design_handoff_workbench_2a/` (README.md + mock `2a-workbench.html`, `3a-diff.html`,
`3b-unwrap.html`, `3c-command-palette.html`, canvas `FormatPritty UI.dc.html`)

ขนาดงาน: **S** = งานเล็ก แก้ไฟล์เดียว · **M** = หลายไฟล์ / มี logic ใหม่เล็กน้อย · **L** = logic ใหม่ + UI + ต้องทดสอบจริงจัง

---

## 0. ภาพรวม: อะไรเปลี่ยนบ้างเมื่อเทียบกับโค้ดปัจจุบัน

| เรื่อง | ปัจจุบัน | ดีไซน์ใหม่ | ผลกระทบ |
| --- | --- | --- | --- |
| Layout | `.app` กว้างสูงสุด 1500px มี padding, header + menu กลาง | เต็ม viewport, top bar + rail 56px + options panel 236px + status strip | เขียน shell ใหม่ทั้งหมด |
| เมนูสลับเครื่องมือ | ปุ่ม 3 ปุ่มกลาง header | icon rail ซ้าย (glyph + caption EN) | แทนที่ `MENU` / `.menu` |
| เอกสาร | `input` ตัวเดียว | document tabs หลายเอกสาร + persist `fp-docs` | รื้อ state ใน `App.jsx` |
| ตัวเลือก (indent/sort/view) | `<select>` + checkbox ใน toolbar | segmented + toggle ใน panel ขวา, ต่อเอกสาร | คอมโพเนนต์ใหม่, ลบ `.toolbar` |
| ปุ่มกระทำ | toolbar บนสุด | action bar **ใต้ pane ต้นฉบับ** | ย้ายทุกหน้า |
| Token สี | น้ำเงิน `#6ea8fe` บน `#0e1116` | มินต์ `#4fd6c0` บน `#08090b` + token ใหม่ ~10 ตัว | แก้ `:root` ทั้งสองธีม |
| ฟอนต์ | system + Noto Sans Thai, ui-monospace | IBM Plex Sans Thai + JetBrains Mono (400/500/600/700) | ต้องเพิ่มฟอนต์ |
| ภาษา | ไทยล้วน | ไทยหลัก + EN sub-label, สวิตช์ TH/EN, persist `fp-lang` | ระบบ label สองภาษา |
| ⌘K | ไม่มี | command palette ~32 คำสั่ง แสดงสถานะปัจจุบัน | ฟีเจอร์ใหม่ |
| Merge หลายก้อน | รวมเสมอใน `parseJson` | toggle "รวมหลายก้อน" ปิดได้ → รายงานเป็น error | เพิ่ม option ให้ `parseJson` |
| Diff อาร์เรย์ | ตาม index เท่านั้น | เลือกได้: ตาม index / จับคู่ด้วยคีย์ (default `id`) + แสดงค่าที่เหมือนกัน | logic ใหม่ใน `diff.js` |
| Unwrap | นับจำนวนชั้น | แสดง chain ของแต่ละชั้น (`1 · string → 2 · payload`) + "แกะซ้ำจนสุด" ≤ 8 รอบ | `unwrap.js` ต้องคืน path |
| Error UX | กล่อง error ในฝั่งผลลัพธ์ | การ์ดใต้ต้นฉบับ + chip `line:column` + **ไปที่บรรทัด n** + **แก้ให้อัตโนมัติ** | lib auto-fix ใหม่ |
| Focus / responsive | ไม่มี focus ring, stack ที่ 860px | focus ring มินต์ทุกจุด, <1180 panel เป็น drawer, <900 stack | เพิ่มใหม่ |

---

## 1. การตัดสินใจที่ต้องเคาะก่อนลงมือ

สิ่งเหล่านี้ handoff เขียนไม่ชัดหรือขัดกับ `CLAUDE.md` — ถ้าเลือกต่างกัน งานจะต่างกันมาก

| # | ประเด็น | ตัวเลือก | คำแนะนำ |
| --- | --- | --- | --- |
| D1 | **Document tabs ครอบคลุมเครื่องมือไหน** — README เขียน `docs: {id,name,input,indent,sortKeys,view}` (เฉพาะ Formatter) แต่ mock หน้า Diff/Unwrap แสดง tab `invoice v1 ⇄ v2`, `order.created.log` | (a) tabs = เอกสาร Formatter เท่านั้น, หน้าอื่นใช้ `left/right/rawString` เดิม · (b) ทุก doc มี `tool` field, tab หนึ่งอัน = เอกสารของเครื่องมือหนึ่ง, rail active = tool ของ doc ที่เปิดอยู่ | **(b)** — ตรง mock, model เดียวใช้ทั้งแอป, `sendToFormatter` = สร้าง doc ใหม่ |
| D2 | **ฟอนต์** — README ให้เลือก self-host หรือ Google Fonts; `CLAUDE.md` ระบุ "ไม่มีการส่งข้อมูลออกนอกเครื่อง" และห้ามเพิ่ม dependency | (a) `<link>` Google Fonts · (b) วางไฟล์ woff2 ใน `public/fonts/` + `@font-face` เอง (ไม่เพิ่ม npm dep) | **(b)** — ไม่มี request ออกนอกเครื่อง, offline ได้; ทั้งสองฟอนต์เป็น OFL |
| D3 | **`sortKeys` default** — mock เปิดอยู่, โค้ดปัจจุบัน `false` | เปิด / ปิด | **ปิด** ตามเดิม — เรียงคีย์เปลี่ยนลำดับข้อมูลผู้ใช้ ไม่ควรเป็นค่าเริ่มต้น (mock น่าจะแค่โชว์สถานะ on) |
| D4 | **ปุ่ม "ตัวอย่าง" หน้า Formatter** — action bar ใหม่มีแค่ `เปิดไฟล์` / `ล้าง` แต่หน้า Unwrap ยังมี `ตัวอย่าง` | (a) ตัดออก · (b) ย้ายไป command palette + empty state (option 2c) | **(b)** — ยังเข้าถึงได้ผ่าน ⌘K "ตัวอย่าง" และ "ตัวอย่างหลายก้อน" |
| D5 | **ปุ่ม "แกะสตริง ⌘↵" หน้า Unwrap** — ปัจจุบันแกะสดอยู่แล้วไม่มีปุ่ม | (a) เขียนผลลัพธ์ที่แกะแล้วทับกลับช่องซ้าย (เหมือน `handleFormat`) · (b) เป็นแค่ trigger ให้ focus ผลลัพธ์ | **(a)** — พฤติกรรมสอดคล้องกับ Formatter |
| D6 | **สัญกรณ์ path เมื่อ diff จับคู่ด้วยคีย์** | `$.items[id=7]` / `$.items[?id==7]` / `$.items.7` | `$.items[id=7]` — อ่านง่าย, copy ไปใช้ต่อได้ |
| D7 | **Auto-fix (แก้ให้อัตโนมัติ)** เป็น logic ใหม่ก้อนใหญ่ที่สุด และ README ระบุเป็น "worth adopting" ไม่ใช่บังคับ | ทำรอบนี้ / เลื่อนไปรอบหน้า | ทำเป็นงานสุดท้าย (T6.1) ตัดออกได้โดยไม่กระทบอย่างอื่น |
| D8 | **`indent`/`view` ที่ `CLAUDE.md` บอกว่าแชร์ระหว่าง Formatter กับ Unwrap โดยตั้งใจ** | คงแชร์ / แยกต่อเอกสาร | **แยกต่อเอกสาร** ตาม README (ถ้าเลือก D1(b) จะได้มาเองโดยธรรมชาติ) แล้วอัปเดต `CLAUDE.md` |

---

## 2. งานแยกตามเฟส

### เฟส 0 — รากฐาน (ทุกอย่างต่อจากนี้พึ่งเฟสนี้)

- [ ] **T0.1 Design tokens ใหม่** — `S`
  - ไฟล์: `src/styles.css`
  - แทนที่ตัวแปรใน `:root` ด้วยตาราง Design Tokens ทั้ง 22 ตัว (`--bg --chrome --panel --panel-2 --border --border-soft --border-strong --text --text-2 --muted --muted-2 --muted-3 --faint --disabled --accent --accent-ink --danger --tok-*`) เพิ่ม `--font-ui`, `--font-mono`, `--shadow-overlay: 0 12px 32px rgba(0,0,0,.45)`
  - ธีมสว่างใน `:root[data-theme='light']` ดึงจาก option 2b ในแคนวาส: bg `#f7f5f0`, chrome `#fbfaf7`, panel `#f0ede6`, border `#ddd9d0` / `#e6e2da`, text `#17181a`, muted `#6a6c70` / `#8a8c90`, accent `#0f766e`, danger `#c0563a`, token `#0f766e #1d4ed8 #b45309 #7c3aed #15803d`
  - เปลี่ยนชื่อ `--bad` → `--danger` และ `--ok` → ใช้ `--accent` (ดีไซน์ใช้มินต์แทนเขียวสำหรับ "valid")
  - เสร็จเมื่อ: ไม่มีค่าสี hardcode นอก `:root` ทั้งสองบล็อก; ทุก token มีทั้ง dark และ light

- [ ] **T0.2 ฟอนต์ IBM Plex Sans Thai + JetBrains Mono** — `S` (ขึ้นกับ D2)
  - ไฟล์: `public/fonts/*.woff2`, `src/styles.css` (`@font-face` + `font-display: swap`), `index.html` (`<link rel="preload">` น้ำหนักที่ใช้บ่อย)
  - น้ำหนัก: Plex Sans Thai 400/500/600, JetBrains Mono 400/500/600/700
  - เสร็จเมื่อ: DevTools Network ไม่มี request ออกนอก origin; ข้อความไทย/โค้ดเรนเดอร์ด้วยฟอนต์ใหม่ทั้งสองธีม

- [ ] **T0.3 ระบบ label สองภาษา + สวิตช์ TH/EN** — `M`
  - ไฟล์ใหม่: `src/lib/i18n.jsx` (`LangContext`, `useLang()`, `<L th="…" en="…" />` เรนเดอร์ไทย + sub-label mono ตอน `th`, เรนเดอร์อังกฤษล้วนตอน `en`), `src/App.jsx` (state `lang`, persist `fp-lang`)
  - **ทำในเฟส 0 โดยตั้งใจ** — ทุกคอมโพเนนต์ที่เขียนใหม่ในเฟส 1–6 ใช้ `<L>` ตั้งแต่แรก ถูกกว่ามาไล่แก้ทีหลัง
  - เสร็จเมื่อ: สลับ TH/EN แล้ว label ทุกจุดที่ผ่าน `<L>` เปลี่ยนตาม; refresh แล้วจำค่าได้

- [ ] **T0.4 คอมโพเนนต์พื้นฐาน `src/components/ui/`** — `M`
  - `Segmented` (indent / view / strategy แนวตั้ง), `Toggle` (track 32×18, knob 14), `Badge` (ok / danger / neutral, `border-radius: 99px`), `KeyCap` (แทน `<kbd>` เดิม), `StatGrid` (2×2), `PaneHead` (ชื่อไทย + sub-label EN + slot ขวา), `IconButton` (26×26)
  - ขยาย `.btn` เป็น `primary` (มินต์) / `secondary` (border `--border-strong`) / `ghost` / `small` (3px 9px, radius 6) ตาม spec
  - เพิ่ม global: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`, transition `border-color .15s, background .15s`, `:active { transform: translateY(1px) }`
  - เสร็จเมื่อ: มีหน้า/ไฟล์ทดลอง (ไม่ commit) ที่เรนเดอร์ทุก primitive ทุก state ตรง mock ทั้งสองธีม

### เฟส 1 — Shell (ทำครั้งเดียว ใช้ทั้ง 3 หน้า)

- [ ] **T1.1 `AppShell` layout** — `M`
  - ไฟล์ใหม่: `src/components/shell/AppShell.jsx`; แก้ `src/App.jsx`, `src/styles.css`
  - โครง: flex column เต็ม viewport → `TopBar` / แถวกลาง (`ToolRail` 56px · เนื้อหา `flex:1 min-width:0` · `OptionsPanel` 236px) / `StatusStrip`; ลบ `.app` max-width/padding, `.header`, `.brand` เดิม, `.menu`
  - พื้นหลัง `--bg`, chrome ทั้ง 4 ชิ้นใช้ `--chrome`, เส้นแบ่งทุกเส้น `1px solid var(--border)`
  - เสร็จเมื่อ: หน้าเปล่า (ยังไม่มีเนื้อหา) วัดสัดส่วนตรง mock ที่ 1120×560; ไม่มี scrollbar แนวนอนของ body

- [ ] **T1.2 `TopBar`** — `M`
  - Brand (logo `FP` 26×26 มินต์ + wordmark), slot สำหรับ `DocTabs` (T2.2), cluster ขวา: ปุ่ม `ค้นหาคำสั่ง ⌘K` (เปิด palette), สวิตช์ `TH / EN` (T0.3), ปุ่มธีม `☀︎ / ☾`
  - เสร็จเมื่อ: ทุกปุ่มทำงาน (palette ยังเป็น stub ได้); `aria-label` ครบทุกปุ่มที่มีแต่ไอคอน

- [ ] **T1.3 `ToolRail`** — `S`
  - 3 รายการ `{ }` FORMAT / `⇄` DIFF / `"⤷` UNWRAP + `?` ล่างสุด; active = `rgba(79,214,192,.12)` + `--accent`, hover `--text-2`
  - พฤติกรรม active ขึ้นกับ D1: ถ้า (b) คลิก rail = สลับไป doc ล่าสุดของ tool นั้น หรือสร้างใหม่ถ้ายังไม่มี
  - เสร็จเมื่อ: สลับหน้าได้ครบ, ใช้คีย์บอร์ด Tab/Enter ได้, มี focus ring

- [ ] **T1.4 `OptionsPanel` + `StatusStrip` (container)** — `S`
  - `OptionsPanel` รับ `title` (ตั้งค่า/OPTIONS หรือ ตัวกรอง/FILTER) + `children`; `OptionGroup` (padding `13px 14px`, เส้นแบ่ง `--border-soft`, กลุ่มสุดท้ายไม่มีเส้น)
  - `StatusStrip` รับ `items` + แสดง `ประมวลผลในเบราว์เซอร์ · NOTHING LEAVES THIS DEVICE` ชิดขวาเสมอ
  - เสร็จเมื่อ: ทั้งสองใช้ซ้ำได้จาก 3 หน้าโดยไม่มี CSS เฉพาะหน้า

- [ ] **T1.5 Responsive** — `M`
  - `< 1180px`: options panel ซ่อน, มีปุ่มไอคอนใน TopBar เปิดเป็น drawer ด้านขวา (scrim + Esc ปิด)
  - `< 900px`: source/output stack แนวตั้ง (แทน `@media (max-width: 860px)` เดิม), rail ยังอยู่
  - เสร็จเมื่อ: ทดสอบที่ 1280 / 1100 / 820 ไม่มี overflow และไม่มี control ที่กดไม่ถึง

### เฟส 2 — Documents & state (ต้องเสร็จก่อนหน้า Formatter)

- [ ] **T2.1 Data model ของเอกสาร** — `M` (ขึ้นกับ D1, D8)
  - ไฟล์ใหม่: `src/lib/docs.js` (สร้าง id, ตั้งชื่อ `เอกสาร n`, reducer `open / close / rename / update / activate`), `src/hooks/useDocs.js`
  - shape (ถ้า D1(b)): `{ id, tool: 'format'|'compare'|'unwrap', name, input, left, right, indent, sortKeys, view, mergeChunks, deep, repeat, strategy, arrayKey, showEqual }` — ใช้เฉพาะฟิลด์ที่ tool นั้นต้องการ
  - state ระดับแอปที่ **ไม่** อยู่ต่อเอกสาร: `theme`, `lang`, `paletteOpen`, `toast`
  - ปิด tab สุดท้าย → สร้าง doc เปล่าของ tool ปัจจุบันอัตโนมัติ (README: "close the last tab → empty state")
  - เสร็จเมื่อ: unit test ด้วย node (ตามสูตรใน `CLAUDE.md`) ครอบคลุม open/close/activate/ปิดอันสุดท้าย

- [ ] **T2.2 `DocTabs` UI** — `M`
  - active tab (พื้น `--panel`, border รวมกับ pane ด้านล่างด้วย `margin-bottom:-1px`), inactive, ปุ่ม `×`, ปุ่ม `+`
  - จุด 6px หน้าชื่อ: มินต์ = valid, `--danger` = invalid, `--muted-3` = ว่าง (ดีไซน์ระบุแค่มินต์ — ขยายให้สื่อสถานะ)
  - ชื่อ tab: ชื่อไฟล์ที่เปิด ไม่งั้น `เอกสาร n`; ดับเบิลคลิกเพื่อเปลี่ยนชื่อ (เสริม ไม่บังคับ)
  - tab ล้นแนวนอน → scroll ในแถบ tab เอง ไม่ดัน cluster ขวา
  - เสร็จเมื่อ: เปิด 5 tab สลับไปมา ข้อความไม่หาย; ปิด tab แล้ว active ย้ายไปอันข้าง ๆ

- [ ] **T2.3 Persist `fp-docs`** — `S`
  - บันทึกลง `localStorage` แบบ debounce 300ms; เก็บ `{ version: 1, activeDocId, docs }`; ข้ามเอกสารที่ `input` > 1 MB (เก็บแต่ metadata) กัน quota เต็ม; ถ้า parse ไม่ได้ให้เริ่มใหม่เงียบ ๆ
  - เสร็จเมื่อ: refresh แล้ว tab + เนื้อหา + ตัวเลือกกลับมาครบ; เอกสารใหญ่ไม่ทำให้แอปค้าง

- [ ] **T2.4 เดินสาย `App.jsx` ใหม่** — `S`
  - ลบ `input/indent/sortKeys/view/left/right/rawString` เดิม → อ่าน/เขียนผ่าน doc ที่ active; `sendToFormatter` = เปิด doc `format` ใหม่พร้อมเนื้อหา
  - เสร็จเมื่อ: ทั้ง 3 หน้าเดิมยังทำงานได้บน state ใหม่ **ก่อน** เริ่มแก้ UI หน้า (เป็น checkpoint ที่ควร commit)

### เฟส 3 — หน้า Formatter (mock 2a)

- [ ] **T3.1 Source pane** — `M`
  - `PaneHead` "ต้นฉบับ / SOURCE" + meta `{n} บรรทัด · {bytes}` ขวา
  - `Editor.jsx`: gutter `11px 8px 11px 14px` สี `--faint`, textarea `11px 14px 11px 4px` สี `#b9bdc4`→token, placeholder `--disabled`; คง `errorLine` + scroll-sync; เพิ่ม `ref` API `focusLine(n)` สำหรับ T3.5; dragover แสดง inset `1.5px dashed var(--accent)`
  - Action bar ล่าง: `จัดรูปแบบ ⌘↵` (primary) · `ย่อขนาด` (secondary) · spacer · `เปิดไฟล์` · `ล้าง` (ghost); ตัวอย่างย้ายตาม D4
  - เสร็จเมื่อ: เทียบ screenshot กับ `2a-workbench.html` ที่ 1120×560 คลาดเคลื่อน ≤ 2px ในจุดหลัก

- [ ] **T3.2 Output pane** — `S`
  - `PaneHead` "ผลลัพธ์ / OUTPUT" + `Badge` `ถูกต้อง / ผิดพลาด / ว่าง` + ปุ่ม small `คัดลอก` `ดาวน์โหลด`
  - `CodeView.jsx` / `JsonTree.jsx`: ใช้ spacing/สีใหม่, pill นับรายการ `{n} รายการ / {n} คีย์`; แถบ `notice` "รวม n ก้อน" คงไว้แต่ปรับสไตล์
  - เสร็จเมื่อ: token 6 สีตรงตาราง; tree พับ/ขยายทำงานเหมือนเดิม

- [ ] **T3.3 Options panel ของ Formatter** — `S`
  - กลุ่ม: ระยะเยื้อง (`Segmented` 2/4/แท็บ) · toggle เรียงคีย์ A→Z · toggle รวมหลายก้อนเป็นอาร์เรย์ · มุมมอง (`Segmented` โค้ด/โครงสร้าง) · สถิติ (`StatGrid` คีย์/ความลึก/ไบต์/บรรทัด จาก `getStats()`)
  - เสร็จเมื่อ: ทุก control เปลี่ยนค่าใน doc ที่ active และผลลัพธ์อัปเดตทันที

- [ ] **T3.4 ตัวเลือก `mergeChunks`** — `M`
  - ไฟล์: `src/lib/json.js` — `parseJson(text, { merge = true } = {})`; เมื่อ `merge:false` และ `scanDocuments` พบ > 1 ก้อน → คืน `{ ok:false, error:{ message:'พบ JSON มากกว่าหนึ่งก้อน — เปิด "รวมหลายก้อน" หรือลบก้อนที่เกิน', line, column } }` ชี้ตำแหน่งต้นก้อนที่ 2
  - **ไม่เปลี่ยน shape ผลลัพธ์** (`CLAUDE.md` เตือนไว้) — แค่เพิ่มพารามิเตอร์; `Compare` (autoSplit) และ `unwrap.js` ยังเรียกแบบ merge เสมอ
  - เสร็จเมื่อ: node test — NDJSON 3 บรรทัด: merge on → array 3, merge off → error บรรทัด 2 คอลัมน์ 1

- [ ] **T3.5 การ์ด error แบบ 1b** — `M`
  - การ์ดใต้ source pane (ไม่ใช่ในฝั่งผลลัพธ์): เหตุผลภาษาไทย, chip `line:column` mono, ปุ่ม **ไปที่บรรทัด n** (เรียก `focusLine` จาก T3.1 — focus textarea + ตั้ง caret ที่ต้นบรรทัด + scroll), ปุ่ม **แก้ให้อัตโนมัติ** (แสดงเฉพาะเมื่อ T6.1 คืนผลได้; ถ้าเลื่อน D7 ให้ซ่อนปุ่ม)
  - สไตล์: พื้น `rgba(255,107,94,.07)`, border `1px solid rgba(255,107,94,.35)`, radius 9
  - เสร็จเมื่อ: วาง `{"a":1,}` → การ์ดขึ้น, กด "ไปที่บรรทัด" แล้ว caret ไปถูกที่

- [ ] **T3.6 Status strip ของ Formatter** — `S`
  - `● VALID` / `● INVALID` / `○ EMPTY`, `UTF-8`, `LF` หรือ `CRLF` (ตรวจจาก input จริง), `JSON`
  - เสร็จเมื่อ: สถานะเปลี่ยนตามอินพุตแบบสด

### เฟส 4 — หน้า Diff (mock 3a)

- [ ] **T4.1 แถวอินพุต** — `S`
  - สูง `154px` คงที่, grid `1fr 1fr`; header ซ้ายมี `LEFT` + badge + `{n} บรรทัด`, header ขวามี `RIGHT` + badge + ปุ่ม `สลับซ้าย–ขวา`
  - `Editor` รับ prop `dense` → mono 11.5px/1.75
  - เสร็จเมื่อ: ตรง mock; `สลับซ้าย–ขวา` ยังทำงาน

- [ ] **T4.2 Header รายการต่าง + ช่องค้นหาเส้นทาง** — `S`
  - `จุดที่ต่างกัน / DIFFERENCES` + badge `{n} จุด` (danger) + input `ค้นหาเส้นทาง…` (กรอง `path` แบบ substring, state ใน page) + ปุ่ม `คัดลอกรายงาน`
  - เสร็จเมื่อ: พิมพ์ `roles` เหลือเฉพาะแถวที่ path มีคำนั้น; รายงานที่คัดลอกยังเป็นรายการทั้งหมด (ไม่ใช่ที่กรอง) — หรือเคาะว่าให้ตามตัวกรอง

- [ ] **T4.3 แถว diff แบบคอลัมน์คงที่** — `M`
  - grid `86px 158px 118px 1fr`; แถบสัญญาณซ้ายด้วย `box-shadow: inset 3px 0 0`; แถวคู่พื้น `--panel`; hover โชว์ chip `คัดลอก` ที่ path; คลิกแถวคัดลอก path (คงเดิม)
  - ค่าซ้าย/ขวาเป็น pill; ฝั่งที่ไม่มี → กรอบ `1px dashed var(--border-strong)` ข้อความ `ไม่มีในก้อนขวา / ไม่มีในก้อนซ้าย` **ห้ามเป็นช่องว่าง**
  - คอลัมน์ "ชนิดที่เปลี่ยน" แสดง `d.kinds` เฉพาะ type `type`
  - ลบ CSS เดิม `.diff-head .diff-values .side .chip.*`
  - เสร็จเมื่อ: ตัวอย่างในแอปให้ 6 แถวหน้าตาตรง `3a-diff.html`; ที่ < 900px pill ซ้าย/ขวา stack ได้

- [ ] **T4.4 Panel ขวา "ตัวกรอง / FILTER"** — `M`
  - รายการตัวกรอง 5 แถว (swatch 7×7 + ชื่อ + จำนวน) แทน `.tabs` เดิม; แถวที่เลือกพื้น `rgba(79,214,192,.1)` + border `.3`
  - `วิธีเทียบ / STRATEGY`: `Segmented` แนวตั้ง `อาร์เรย์เทียบตามลำดับ` / `จับคู่ด้วยคีย์ [id]` — ตัวเลือกหลังมี input ชื่อคีย์เล็ก ๆ (default `id`)
  - toggle `แสดงค่าที่เหมือนกันด้วย / SHOW EQUAL`
  - การ์ด `สรุป / SUMMARY`: ตัวเลขรวม (danger หรือ accent เมื่อ 0), แถบสัดส่วน 6px แบ่งตามชนิด, `{n} คีย์ที่ตรงกัน · {n} คีย์รวม`
  - เสร็จเมื่อ: ทุก control ผูกกับ doc; แถบสัดส่วนรวมกันเต็ม 100% เสมอ

- [ ] **T4.5 `lib/diff.js` — จับคู่ด้วยคีย์ + แสดงค่าเท่ากัน + นับคีย์** — `L`
  - `diffJson(a, b, { arrayKey = null, includeEqual = false } = {})`
  - โหมด `arrayKey`: ถ้าทั้งสองอาร์เรย์เป็นอ็อบเจ็กต์ที่มีคีย์นั้นครบ → จับคู่ตามค่าคีย์ (path ตาม D6 เช่น `$.items[id=7]`), รายการที่ไม่มีคู่ = `added` / `removed`; ถ้าอาร์เรย์ไม่เข้าเงื่อนไข (มี primitive, คีย์หาย, คีย์ซ้ำ) → fallback เป็น index **สำหรับอาร์เรย์นั้น** และติดธง `fallback:true` ไว้ในผลเพื่อแสดง notice
  - `includeEqual`: เพิ่มแถว `{ path, type:'equal', left, right }` เฉพาะใบ (leaf) — UI แสดงสี `--muted-3` ไม่มีแถบสัญญาณ; `summarize()` / `toReport()` ต้องไม่นับ `equal`
  - ใหม่: `countKeys(a, b)` → `{ matched, total }` สำหรับการ์ดสรุป
  - `LABEL` เปลี่ยนเป็นข้อความสั้นตามดีไซน์ (`ค่าต่างกัน / ชนิดต่างกัน / เฉพาะซ้าย / เฉพาะขวา`) — เช็ค `toReport()` ด้วย
  - เสร็จเมื่อ: node test อย่างน้อย 6 กรณี (index vs key, คีย์หาย, คีย์ซ้ำ, ลำดับสลับแต่ข้อมูลเหมือน → 0 diffs ในโหมดคีย์, includeEqual, countKeys)

- [ ] **T4.6 Status strip + notice auto-split** — `S`
  - `● {n} DIFFS` (danger) / `● IDENTICAL` (accent), `BY INDEX` / `BY KEY id`, `DEEP`
  - notice "พบ JSON 2 ก้อนในช่องซ้าย — แยกให้อัตโนมัติ" อยู่เหนือรายการ (คงพฤติกรรมเดิม)

### เฟส 5 — หน้า Unwrap (mock 3b)

- [ ] **T5.1 Pane ซ้าย + chain ชั้นที่แกะ** — `M`
  - `PaneHead` "สตริง JSON / ESCAPED STRING" + meta; `Editor` เพิ่ม prop `wrap` → `word-break: break-all; white-space: pre-wrap`
  - การ์ด `ชั้นที่แกะได้ · PEELED LAYERS`: chips `{n} · {where}` คั่นด้วย `→`, chip สุดท้ายสีมินต์; ซ่อนการ์ดเมื่อ 0 ชั้น
  - Action bar: `แกะสตริง ⌘↵` (พฤติกรรมตาม D5) · `ตัวอย่าง` (สลับ SAMPLE / SAMPLE_NESTED หรือเป็นเมนู) · `ล้าง`
  - เสร็จเมื่อ: `SAMPLE_NESTED` แสดง `1 · string → 2 · payload → 3 · customer` ตรง mock

- [ ] **T5.2 Pane ขวา + สถานะล้มเหลว** — `M`
  - badge `แกะสำเร็จ {n} ชั้น` / `แกะไม่สำเร็จ` / `ว่าง`; ปุ่ม `คัดลอก` `ดาวน์โหลด`
  - แถบล่าง: `ส่งไปหน้าจัดรูปแบบ` (secondary, ย้ายจาก toolbar) + `{n} บรรทัด · {n} คีย์` ขวา
  - การ์ดล้มเหลวสไตล์ 1b (เหมือน T3.5) คงข้อความสองแบบเดิม + `<pre class="peeled">`
  - เสร็จเมื่อ: 3 สถานะ (สำเร็จ / ล้มเหลวหลังแกะได้บางชั้น / ล้มเหลวตั้งแต่ชั้นแรก) แสดงถูกต้อง

- [ ] **T5.3 Options panel ของ Unwrap** — `S`
  - toggle `แกะสตริงในฟิลด์ย่อย / DEEP UNWRAP` (= `deep`, ย้ายจาก `useState` ในหน้าไปอยู่ใน doc) · toggle `แกะซ้ำจนสุด / REPEAT UNTIL STABLE` · ระยะเยื้อง · มุมมอง · `StatGrid` `ชั้น` (ค่าเป็นสีมินต์) / `ฟิลด์` / `คีย์` / `ความลึก`
  - Status strip: `● UNWRAPPED ×{n}`, `DEEP` (เมื่อเปิด), `UTF-8`

- [ ] **T5.4 `lib/unwrap.js` — คืน path ของแต่ละชั้น + โหมดแกะซ้ำ** — `M`
  - `unwrapJson(text)` → เพิ่ม `layers: Array<{ n, where:'string' }>` (คงตัวเลขเดิมไว้ใน `layerCount` หรือใช้ `layers.length` — ไล่แก้ `Unwrap.jsx` ที่อ่าน `result.layers` เป็นตัวเลขอยู่ 6 จุด)
  - `unwrapNested(value)` → `{ value, count, fields: Array<{ path, depth }> }` — path เช่น `payload`, `payload.customer` (ใช้สร้าง chip `2 · payload`)
  - `unwrapNested(value, { repeat = false })` → เมื่อ `repeat` วนซ้ำจน `JSON.stringify` ก่อน/หลังเท่ากัน สูงสุด 8 รอบ คืน `passes`
  - เสร็จเมื่อ: node test — `SAMPLE_NESTED` ให้ fields `['payload','payload.customer']`; อินพุตที่ escape ต่างระดับกันแกะครบเมื่อ `repeat:true` และหยุดที่ 8 รอบเมื่อป้อนสตริงที่แกะไม่รู้จบ

### เฟส 6 — Command palette (mock 3c) + auto-fix

- [ ] **T6.1 `lib/fix.js` — แก้ให้อัตโนมัติ** — `L` (ตัดออกได้ตาม D7)
  - รับ `text` + `error` จาก `parseJson`; พยายามแก้ทีละกรณีแล้ว re-parse ยืนยัน: (1) จุลภาคท้ายก่อน `}` / `]` (2) จุลภาคซ้ำ `,,` (3) single quote → double quote (เฉพาะนอกสตริงที่ถูกต้องอยู่แล้ว) (4) คีย์ไม่มีเครื่องหมายคำพูด `{a:1}`; วนได้สูงสุด 5 รอบ
  - คืน `{ fixed, applied: ['trailing-comma', …] }` หรือ `null` — ห้ามคืนผลที่ parse ไม่ผ่าน
  - เสร็จเมื่อ: node test 8 กรณี (4 กรณีแก้ได้, 2 กรณีผสม, 2 กรณีที่ต้องคืน `null` เช่น สตริงไม่ปิด)

- [ ] **T6.2 Command registry** — `M`
  - ไฟล์ใหม่: `src/lib/commands.js` — แต่ละคำสั่ง `{ id, th, en, group, glyph, keys?, run(ctx), state?(ctx) → 'เปิดอยู่' | null, when?(ctx) }`
  - ครอบคลุมตาม README: format, minify, copy, download, open file, clear, indent 2/4/tab, sort keys, merge chunks, view code/tree, switch tool ×3, switch document (dynamic ตาม docs), swap sides, copy report, diff strategy, show equal, deep unwrap, repeat unwrap, send to formatter, toggle theme, toggle language, ตัวอย่าง (D4)
  - `ctx` มาจาก `App.jsx` (actions ของ doc ที่ active + setters ระดับแอป) — ควรทำ `useActions()` เดียวที่ทั้งหน้าและ palette ใช้ร่วมกัน เพื่อไม่ให้ logic `handleFormat` ซ้ำสองที่
  - เสร็จเมื่อ: ทุกคำสั่งใน registry เรียก `run` แล้วได้ผลเหมือนกดปุ่มใน UI

- [ ] **T6.3 `CommandPalette` UI** — `M`
  - modal 544px, scrim `rgba(8,9,11,.6)`, query row (`›` + input + `ESC`), กลุ่ม `ตั้งค่า · OPTIONS` / `คำสั่งที่ใกล้เคียง · RELATED` / ฯลฯ, แถว (glyph 18px + ชื่อไทย + hint EN mono + KeyCap หรือ pill `เปิดอยู่`), footer `↑↓ เลื่อน · ↵ เลือก · ⌘K ปิด · {n} คำสั่ง`
  - ค้นหา: substring ไม่สนตัวพิมพ์ทั้ง `th` และ `en` (`เยื้อง` และ `indent` เจอแถวเดียวกัน); list สูงสุด 360px scroll; แถวที่เลือก scroll เข้ามาเสมอ
  - คีย์บอร์ด: `⌘/Ctrl+K` เปิด-ปิด, `↑↓`, `↵`, `Esc`; focus trap; ปิดแล้วคืน focus ที่เดิม; `role="dialog" aria-modal`
  - เสร็จเมื่อ: ใช้งานได้โดยไม่แตะเมาส์ครบทุกคำสั่ง; ที่ `lang=en` แถวแสดงอังกฤษเป็นหลัก

### เฟส 7 — เก็บงาน

- [ ] **T7.1 ลบ CSS / โค้ดที่ตายแล้ว** — `S`
  - `.toolbar .menu .tabs .field .check select .statusbar (เดิม) .diff-head .diff-values .side .chip .brand-mark .header` และ `MENU` ใน `App.jsx`, `INDENTS` ที่ซ้ำใน 2 หน้า
  - เสร็จเมื่อ: `grep` ชื่อคลาสทุกตัวใน `styles.css` เจอใน `src/**/*.jsx` อย่างน้อย 1 ที่

- [ ] **T7.2 QA ธีมสว่าง + contrast** — `S`
  - เทียบกับ 2b ในแคนวาส; ตรวจ contrast ≥ 4.5:1 สำหรับ `--muted-3` บน `--chrome` ทั้งสองธีม (วัดแล้ว: `--muted-3 #5d626b` บน chrome = 3.2:1, `--muted-2 #6b7078` = 3.9:1, เลขบรรทัด `--faint #3d424a` = 2.0:1, placeholder `--disabled #41464e` = 2.1:1 — ทั้งหมดต่ำกว่า AA 4.5:1; เลขบรรทัดกับ placeholder พอรับได้ (ไม่ใช่เนื้อหาหลัก) แต่ sub-label EN และ status strip ควรยกเป็นอย่างน้อย `#7a7f88` (≈4.6:1) หรือบันทึกว่ายอมรับ)

- [ ] **T7.3 Accessibility pass** — `S`
  - focus ring ทุกจุด, `aria-label` ปุ่มไอคอน, `aria-pressed` บน toggle/segmented, toast `role="status"`, ลำดับ Tab: rail → tabs → source → output → panel

- [ ] **T7.4 อัปเดตเอกสาร** — `S`
  - `CLAUDE.md`: architecture ใหม่ (shell, `docs` model, i18n, palette/registry), token ใหม่ + กติกา "สีใหม่ต้องประกาศทั้งสองธีม" (ยังใช้), สูตร SSR check ที่ props ของ `Formatter` เปลี่ยน, ข้อ D8
  - `README.md` ผู้ใช้: ฟีเจอร์ใหม่ (tabs, ⌘K, TH/EN)

- [ ] **T7.5 ตรวจรับรวม** — `M`
  - `npm run build` ผ่าน · SSR smoke ทั้ง 3 หน้า + palette ด้วยสูตร esbuild ใน `CLAUDE.md` · node test ของ `json / diff / unwrap / fix / docs` ผ่านหมด
  - เปิดเบราว์เซอร์ที่ 1120×560 เทียบ mock ทั้ง 4 ทีละภาพ; ทดสอบ 1180 / 900 breakpoints; ทดสอบ persist หลัง refresh; ตรวจ Network ว่าไม่มี request ออกนอก origin

---

## 3. ลำดับที่แนะนำ และงานที่ทำขนานได้

```
เฟส 0 (T0.1–T0.4)  ──►  เฟส 1 (T1.1–T1.5)  ──►  เฟส 2 (T2.1–T2.4) ── commit checkpoint: หน้าเดิมทำงานบน shell+docs ใหม่
                                                        │
                              ┌─────────────────────────┼─────────────────────────┐
                              ▼                         ▼                         ▼
                      เฟส 3 Formatter            เฟส 4 Diff                เฟส 5 Unwrap
                      (T3.4 json.js ก่อน)       (T4.5 diff.js ก่อน)       (T5.4 unwrap.js ก่อน)
                              └─────────────────────────┼─────────────────────────┘
                                                        ▼
                                      เฟส 6 palette (T6.2 ต้องรู้ actions ครบทุกหน้า)
                                      T6.1 auto-fix ทำเมื่อไหร่ก็ได้ (ขึ้นกับ T3.5 แค่ตอนต่อปุ่ม)
                                                        ▼
                                                  เฟส 7 เก็บงาน
```

- **ควรทำ lib ก่อน UI ในแต่ละเฟส** (T3.4, T4.5, T5.4) เพราะทดสอบด้วย node ได้โดยไม่ต้องเปิดเบราว์เซอร์ และ UI จะได้ผูกกับ shape จริง
- เฟส 3 / 4 / 5 แตะคนละไฟล์ ทำขนานกันได้ถ้ามีคนหลายคน — ข้อยกเว้นคือ `Editor.jsx` (T3.1 เพิ่ม `focusLine`, T4.1 เพิ่ม `dense`, T5.1 เพิ่ม `wrap`) ให้คนที่ทำ T3.1 เพิ่มทั้ง 3 prop ไปทีเดียว
- แนะนำ branch `redesign/workbench` + commit ปิดแต่ละเฟส (อย่างน้อย checkpoint หลังเฟส 2 เพราะเป็นจุดที่ regression เสี่ยงที่สุด)

## 4. ความเสี่ยงที่ควรรู้ก่อน

| ความเสี่ยง | ผล | ทางกัน |
| --- | --- | --- |
| รื้อ state เป็น `docs[]` (T2.1) ทำหน้าเดิมพัง | ทั้งแอปใช้ไม่ได้ | ทำเฟส 2 ให้จบและ commit ก่อนแตะ UI หน้าใด ๆ; SSR smoke ทั้ง 3 หน้า |
| `localStorage` เต็มจาก JSON ก้อนใหญ่ | เขียนไม่ได้ / แอปช้า | cap 1 MB ต่อ doc, try/catch รอบ `setItem` |
| `parseJson` ถูกเรียกจาก 3 ที่ + `unwrap.js` | เพิ่ม option แล้วลืมที่ใดที่หนึ่ง | เพิ่มเป็น option object ที่ default เหมือนเดิม ไม่เปลี่ยน shape |
| key-matching ใน diff เจออาร์เรย์ที่คีย์ซ้ำ/ไม่ครบ | ผล diff มั่ว | fallback เป็น index ต่ออาร์เรย์ + notice ให้ผู้ใช้เห็น |
| auto-fix แก้ผิดความหมาย (เช่น เปลี่ยน `'` ในเนื้อสตริง) | ทำลายข้อมูลผู้ใช้ | ยืนยันด้วย re-parse เสมอ, ใส่ toast "แก้ n จุด — ตรวจสอบก่อนใช้", ไม่ auto-apply |
| ฟอนต์ไทย Plex 400/500/600 ≈ 3 ไฟล์ × ~60–90 KB | โหลดครั้งแรกช้าลง | `font-display: swap` + preload เฉพาะ 400 และ mono 400 |
