import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  langFromSearch,
  normalizeSiteUrl,
  renderPage,
  renderRobots,
  renderSitemap,
} from './src/lib/seo.js'

// SEO (src/lib/seo.js): แทน <!--seo:head--> / <!--seo:noscript--> ใน index.html ตามภาษา
// build ได้ index.html (ไทย) + index.en.html (nginx / Worker เสิร์ฟให้ /?lang=en) + 404.html (หน้าไทยเดียวกัน
// ให้ Cloudflare ตอบ path ที่ไม่มีไฟล์ — not_found_handling ใน wrangler.jsonc) + robots.txt (+ sitemap.xml ถ้ามี SITE_URL)
function seo(siteUrl) {
  let thaiHtml = null
  let englishHtml = null
  return {
    name: 'format-pretty:seo',
    enforce: 'post',
    transformIndexHtml: {
      // post = หลัง vite ใส่ <script>/<link> ของ asset ที่มี hash แล้ว ทั้งสองภาษาจึงได้ asset ชุดเดียวกัน
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) {
          // dev: เลือกภาษาตาม ?lang ของ request จะได้ดู <head> ภาษาอังกฤษได้ด้วย
          const lang = langFromSearch(new URL(ctx.originalUrl ?? '/', 'http://dev').search)
          return renderPage(html, lang ?? 'th', siteUrl)
        }
        englishHtml = renderPage(html, 'en', siteUrl)
        thaiHtml = renderPage(html, 'th', siteUrl)
        return thaiHtml
      },
    },
    generateBundle() {
      if (!englishHtml) throw new Error('seo: ยังไม่ได้ render index.html — ลำดับ plugin ผิด')
      this.emitFile({ type: 'asset', fileName: 'index.en.html', source: englishHtml })
      this.emitFile({ type: 'asset', fileName: '404.html', source: thaiHtml })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots(siteUrl) })
      if (siteUrl) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(siteUrl) })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // SITE_URL = URL จริงของเว็บ (env, .env.production หรือ Docker build arg) ใช้กับ canonical / hreflang /
  // og:url / og:image / sitemap — ไม่ตั้งก็ build ได้ แค่ไม่มีแท็กที่ต้องใช้ URL เต็ม
  const siteUrl = normalizeSiteUrl(loadEnv(mode, process.cwd(), '').SITE_URL)
  return {
    plugins: [react(), seo(siteUrl)],
    server: { port: 5173, open: true },
  }
})
