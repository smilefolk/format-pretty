# FormatPritty

เว็บเครื่องมือ JSON ที่ทำงานฝั่งเบราว์เซอร์ทั้งหมด — ข้อมูลที่วางลงไปไม่ถูกส่งออกไปที่ไหน
(ไม่มี backend, ไม่มี analytics, ฟอนต์อยู่ในเครื่อง)

สร้างด้วย React + Vite ไม่มี dependency อื่นนอกจาก `react` / `react-dom`
(ตัวตรวจไวยากรณ์ JSON, syntax highlighting, มุมมองต้นไม้, ตัวเทียบข้อมูล และ command palette เขียนเองทั้งหมด)

## ใช้งาน

- **แท็บเอกสาร** — เปิด JSON หลายก้อนพร้อมกัน แต่ละแท็บจำเนื้อหาและตัวเลือกของตัวเอง (ระยะเยื้อง มุมมอง ฯลฯ)
  และกลับมาครบหลัง refresh (เก็บใน localStorage ของเบราว์เซอร์) ดับเบิลคลิกหรือ `F2` เปลี่ยนชื่อ, `Delete` ปิด
- **⌘K / Ctrl+K** — ค้นหาคำสั่งทั้งหมดด้วยคีย์บอร์ด พิมพ์ไทยหรืออังกฤษก็ได้ (`เยื้อง` = `indent`)
  ตัวอย่างข้อมูลของทุกเครื่องมืออยู่ในนี้ (`ใส่ตัวอย่าง`)
- **TH / EN** — ป้ายกำกับไทยพร้อมคำอังกฤษตัวเล็ก หรือสลับเป็นอังกฤษล้วน; สลับธีมมืด/สว่างได้
- panel ด้านขวาเป็นตัวเลือกของเครื่องมือที่เปิดอยู่ แถบล่างบอกสถานะ (`● VALID · UTF-8 · LF · JSON`)

### 1. จัดรูปแบบ JSON

- จัดรูปแบบ (`⌘/Ctrl + Enter`) และย่อขนาด เลือกระยะเยื้อง 2 / 4 / แท็บ
- เรียงคีย์ A→Z, มุมมองโค้ดพร้อมเลขบรรทัด หรือมุมมองโครงสร้างแบบพับ/ขยายได้
- ตรวจสอบสดขณะพิมพ์ การ์ดบอกสาเหตุเป็นภาษาไทยพร้อม `บรรทัด:คอลัมน์`, ปุ่ม "ไปที่บรรทัด"
  และ **แก้ให้อัตโนมัติ** สำหรับข้อผิดพลาดแบบกลไก (จุลภาคท้าย/ซ้ำ, single quote, คีย์ไม่มีเครื่องหมายคำพูด) —
  ไม่แก้ให้เองจนกว่าจะกด และแจ้งให้ตรวจสอบก่อนใช้
- วาง JSON หลายก้อนต่อกันได้ (NDJSON, `{...}{...}`, `{...},{...}`) รวมเป็นอาร์เรย์อัตโนมัติ (ปิดได้ใน panel)
- เปิดไฟล์หรือลากไฟล์มาวาง, คัดลอก, ดาวน์โหลด, สถิติ (คีย์ ความลึก ไบต์ บรรทัด)

### 2. เปรียบเทียบ 2 ก้อน

เทียบ JSON สองก้อนแบบลึกทุกระดับ แยกความต่างเป็น 4 ชนิด: ค่าต่างกัน, ชนิดต่างกัน, เฉพาะซ้าย, เฉพาะขวา
พร้อมเส้นทางแบบ `$.profile.city` / `$.roles[1]` (คลิกหรือกด Enter เพื่อคัดลอก), ตัวกรองตามชนิด, ค้นหาเส้นทาง,
แสดงค่าที่เหมือนกันด้วย, สลับซ้าย–ขวา และคัดลอกรายงานเป็นข้อความ

- **วิธีเทียบอาร์เรย์**: ตามลำดับ (index) หรือ **จับคู่ด้วยคีย์** เช่น `id` — เส้นทางจะเป็น `$.items[id=7]`
  และรายการที่สลับตำแหน่งแต่ข้อมูลเหมือนกันจะไม่นับเป็นความต่าง (อาร์เรย์ที่ไม่มีคีย์ครบจะเทียบตามลำดับแทนพร้อมแจ้ง)
- วางสองก้อนในช่องซ้ายช่องเดียวแล้วเว้นช่องขวาไว้ก็ได้ ระบบจะแยกให้เอง

### 3. สตริง → JSON

แกะ JSON ที่ถูก escape เป็นสตริงกลับมาเป็นข้อมูลจริง รองรับทั้งแบบมีเครื่องหมายคำพูดครอบ (`"{\"a\":1}"`)
และแบบวางมาดิบ ๆ (`{\"a\":1}`) รวมถึง escape ซ้อนหลายชั้น การ์ด "ชั้นที่แกะได้" แสดงลำดับที่แกะ
(`1 · string → 2 · payload → 3 · customer`)

- **แกะสตริงในฟิลด์ย่อย** (เช่น `payload` ในล็อก) แกะครบในคราวเดียวแม้แต่ละฟิลด์ escape ต่างระดับกัน
- `⌘/Ctrl + Enter` เขียนผลที่แกะแล้วทับช่องซ้าย หรือส่งต่อไปหน้าจัดรูปแบบเป็นเอกสารใหม่ในคลิกเดียว

## การพัฒนา

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build ไปที่ dist/
npm run preview  # เสิร์ฟไฟล์ที่ build แล้ว

node scripts/check-lib.mjs    # ทดสอบ src/lib ด้วย node
python3 scripts/check-css.py  # หา CSS class ที่ไม่มีใครใช้
```

## Docker

build เป็นไฟล์ static แล้วเสิร์ฟด้วย nginx (multi-stage: `node:24-alpine` → `nginx:1.30-alpine`)

```bash
docker compose up -d   # build + เสิร์ฟที่ http://localhost:8080 (เปลี่ยนพอร์ต: PORT=3000 docker compose up -d)
docker compose down
```

- compose ตั้ง `pull_policy: build` ไว้ `up` จึง build ใหม่ให้เสมอ (ไม่ต้องจำ `--build` — ถ้าไม่มีอะไรแก้ layer cache ทำให้ใช้เวลา ~2 วินาที)
- คอนเทนเนอร์รันแบบ read-only filesystem, `cap_drop: ALL` (เหลือเฉพาะที่ nginx ต้องใช้จริง) และ `no-new-privileges`
- `Content-Security-Policy` ตั้ง `connect-src 'none'` — แอปไม่ยิง request ออกนอกเครื่องอยู่แล้ว ถ้ามีโค้ดใหม่เผลอเรียก
  fetch เบราว์เซอร์จะบล็อกให้เห็นทันที (header ทั้งชุดอยู่ใน `nginx-security-headers.conf`)
- ไฟล์ใน `/assets/` และ `/fonts/` cache 1 ปีแบบ immutable ส่วน `index.html` เป็น `no-cache` เพื่อให้ deploy ใหม่
  ไม่ค้างอยู่กับ asset ชุดเก่า
- URL ที่ใช้ได้มีแค่ `/` กับ `/?lang=en` และไฟล์ที่มีจริง — path อื่นตอบ `404` (แต่ยังแสดงแอป) กัน Google เห็นเป็นหน้าซ้ำ

## Cloudflare

deploy เป็น Worker + static assets (workers.dev) ด้วย wrangler ผ่าน `npx` — ไม่ได้ติดตั้งเป็น dependency

```bash
npx --yes wrangler@4.159.0 login   # ครั้งแรกครั้งเดียว — เปิดเบราว์เซอร์ให้อนุญาต
npm run deploy                     # build (SITE_URL อยู่ใน wrangler.jsonc) + อัพโหลด
npm run cf:dev                     # จำลอง Cloudflare ในเครื่องที่ http://localhost:8787
```

- `wrangler.jsonc`: เสิร์ฟ `dist/` เป็น static assets; Worker (`worker/index.js`) ทำงานเฉพาะ `/` เพื่อเลือก
  `index.en.html` ให้ `/?lang=en` (แบบเดียวกับ nginx) — ไฟล์อื่นไม่ผ่าน Worker จึงไม่นับเป็น request ของ Worker
- path ที่ไม่มีไฟล์ตอบ `404` + `404.html` (หน้าแอป) เหมือน nginx
- header ความปลอดภัยและ cache อยู่ `public/_headers` — ค่าต้องตรงกับ `nginx-security-headers.conf`
  (`node scripts/check-lib.mjs` ตรวจให้)
- เปลี่ยนโดเมน: แก้ `SITE_URL` ใน `build.command` ของ `wrangler.jsonc` แล้ว `npm run deploy`
- `send_metrics: false` — wrangler ไม่ส่ง usage metrics

## SEO

- ตั้ง **`SITE_URL`** เป็น URL จริงของเว็บตอน build: `SITE_URL=https://json.example.com docker compose up -d`
  (หรือ `npm run build` / ใส่ใน `.env.production`) — ใช้กับ canonical, hreflang, `og:url`, `og:image` และ `sitemap.xml`
  ไม่ตั้งก็ build ได้ แต่แท็กพวกนั้นและ `sitemap.xml` จะไม่มี (`robots.txt` มีเสมอ)
- หน้าแรกมีสองภาษา: `/` = ไทย, `/?lang=en` = อังกฤษ — build ได้ `index.html` กับ `index.en.html` ที่ `<head>`
  (title / description / Open Graph / JSON-LD) เป็นภาษานั้น nginx เลือกไฟล์ตาม `?lang` และแอปเปิดภาษาตาม URL;
  กด TH/EN ในหน้าแล้ว URL เปลี่ยนตาม (คัดลอกลิงก์ไปให้คนอื่นได้ภาษาเดียวกัน) — โฮสต์อื่นที่ไม่ใช่ nginx ชุดนี้ต้องตั้งกฎเดียวกัน
- ข้อความ SEO ทั้งหมดอยู่ที่ `src/lib/seo.js` ที่เดียว; ไอคอนและรูปแชร์ (`public/og-image.png` 1200×630)
  สร้างใหม่ได้ด้วย `node scripts/render-images.mjs` (ใช้ Chrome ในเครื่อง)
- ตอนปิด JavaScript (และ crawler ที่ไม่รัน JS) เห็นคำอธิบายเครื่องมือแทนหน้าว่าง
- Lighthouse ผ่าน Docker ได้ SEO 92 เพราะ audit `robots-txt` ดาวน์โหลดไฟล์ผ่าน `fetch` ในหน้า ซึ่ง CSP
  `connect-src 'none'` บล็อกไว้ — crawler จริงขอ `robots.txt` ตรง ๆ ไม่โดน (บน `vite preview` ที่ไม่มี CSP ได้ 100)

## โครงสร้าง

```
src/
  App.jsx               shell + เอกสาร (docs) + ธีม/ภาษา + ⌘K
  pages/                Formatter · Compare · Unwrap
  components/
    shell/              AppShell · TopBar · DocTabs · ToolRail · OptionsPanel · StatusStrip · slots
    ui/                 Badge · IconButton · KeyCap · PaneHead · Segmented · StatGrid · Toggle
    Editor · CodeView · JsonTree · ErrorCard · CommandPalette
  hooks/
    useDocs.js          state เอกสาร + persist localStorage
    useActions.js       action ของแต่ละหน้า (ปุ่มและ ⌘K เรียกตัวเดียวกัน)
  lib/
    locate.js           ตัวตรวจไวยากรณ์ JSON ที่เขียนเอง (ระบุตำแหน่งผิด + แยกหลายก้อน)
    json.js             parseJson / จัดรูปแบบ / สถิติ / tokenizer
    diff.js             เปรียบเทียบแบบลึก (index หรือจับคู่ด้วยคีย์)
    unwrap.js           แกะสตริง JSON (ชั้นนอก + ในฟิลด์)
    fix.js              แก้ JSON ให้อัตโนมัติ
    commands.js         registry ของคำสั่ง ⌘K
    seo.js              <head> / noscript ต่อภาษา, robots.txt, sitemap.xml (ใช้ตอน build ผ่าน vite.config.js)
    docs.js · i18n.jsx · samples.js · path.js · constants.js
public/                 favicon · apple-touch-icon · og-image (สร้างด้วย scripts/render-images.mjs) · _headers (Cloudflare)
worker/                 Worker ของ Cloudflare (เลือกภาษาหน้าแรกตาม ?lang)
public/fonts/           IBM Plex Sans Thai + JetBrains Mono (self-host, OFL)
docs/                   แผนงาน redesign
scripts/                check-lib.mjs · check-css.py · render-images.mjs
```

ตัวตรวจไวยากรณ์เขียนเองเพราะข้อความ error ของ `JSON.parse` ในเบราว์เซอร์มักไม่บอกตำแหน่ง
(เช่น `Unexpected token ',', ..."..." is not valid JSON`) ทำให้ชี้บรรทัดที่ผิดให้ผู้ใช้ไม่ได้
