// Worker บน Cloudflare — ทำงานเฉพาะ path "/" (assets.run_worker_first ใน wrangler.jsonc)
// ไฟล์อื่นทั้งหมดเสิร์ฟจาก static assets ตรง ๆ ไม่ผ่านโค้ดนี้ (ไม่นับเป็น request ของ Worker)
//
// หน้าแรกมีสองภาษา (src/lib/seo.js): /?lang=en ต้องได้ index.en.html ที่ <head> เป็นอังกฤษ
// แบบเดียวกับ `map $arg_lang` ใน nginx.conf — static assets เลือกไฟล์ตาม query string เองไม่ได้
import { langFromSearch } from '../src/lib/seo.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (langFromSearch(url.search) !== 'en') return env.ASSETS.fetch(request)
    // html_handling (auto-trailing-slash) เสิร์ฟ index.en.html ที่ /index.en — ขอ /index.en.html ตรง ๆ จะได้ 307
    // ส่ง request เดิมต่อ (method, If-None-Match ฯลฯ) เปลี่ยนแค่ path
    return env.ASSETS.fetch(new Request(new URL('/index.en', url), request))
  },
}
