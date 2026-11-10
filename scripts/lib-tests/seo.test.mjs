import assert from 'node:assert/strict'
import { suite } from './_harness.mjs'
import {
  SEO,
  escapeHtml,
  langFromSearch,
  normalizeSiteUrl,
  pageUrl,
  renderPage,
  renderRobots,
  renderSitemap,
  searchForLang,
} from '../../src/lib/seo.js'

const { t, done } = suite('seo.js')

const SOURCE = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <!--seo:head-->
  </head>
  <body>
    <div id="root"><!--seo:noscript--></div>
  </body>
</html>`

const SITE = 'https://json.example.com'

// ค่าของแท็ก/แอตทริบิวต์แรกที่ตรง regex — ไว้อ่านค่าจาก HTML ที่ render แล้ว
const attr = (html, re) => html.match(re)?.[1]
const jsonLd = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])

t('langFromSearch: อ่าน ?lang ที่รู้จักเท่านั้น', () => {
  assert.equal(langFromSearch('?lang=en'), 'en')
  assert.equal(langFromSearch('?lang=th'), 'th')
  assert.equal(langFromSearch('?x=1&lang=en'), 'en')
  assert.equal(langFromSearch(''), null)
  assert.equal(langFromSearch('?lang=fr'), null)
  assert.equal(langFromSearch('?lang=EN'), null)
})

t('searchForLang: en ใส่ ?lang=en, th ลบออก (URL หลัก) และคงพารามิเตอร์อื่น', () => {
  assert.equal(searchForLang('', 'en'), '?lang=en')
  assert.equal(searchForLang('?lang=en', 'en'), '?lang=en')
  assert.equal(searchForLang('?lang=en', 'th'), '')
  assert.equal(searchForLang('?lang=th', 'th'), '')
  assert.equal(searchForLang('?x=1', 'en'), '?x=1&lang=en')
  assert.equal(searchForLang('?lang=en&x=1', 'th'), '?x=1')
})

t('pageUrl: ไทยเป็น path เปล่า อังกฤษเป็น ?lang=en', () => {
  assert.equal(pageUrl('th', SITE), `${SITE}/`)
  assert.equal(pageUrl('en', SITE), `${SITE}/?lang=en`)
  assert.equal(pageUrl('en'), '/?lang=en')
})

t('normalizeSiteUrl: ตัด / ท้าย, ว่าง = null, ไม่ใช่ http(s) = throw', () => {
  assert.equal(normalizeSiteUrl('https://json.example.com/'), SITE)
  assert.equal(normalizeSiteUrl('  https://json.example.com//  '), SITE)
  assert.equal(normalizeSiteUrl('http://localhost:8080'), 'http://localhost:8080')
  assert.equal(normalizeSiteUrl('https://example.com/tools/'), 'https://example.com/tools')
  assert.equal(normalizeSiteUrl(''), null)
  assert.equal(normalizeSiteUrl(undefined), null)
  assert.throws(() => normalizeSiteUrl('json.example.com'), /SITE_URL/)
  assert.throws(() => normalizeSiteUrl('ftp://json.example.com'), /SITE_URL/)
  assert.throws(() => normalizeSiteUrl('https://json.example.com/?a=1'), /SITE_URL/)
})

t('escapeHtml: escape ทุกตัวที่ทำให้หลุดจาก attribute/element ได้', () => {
  assert.equal(escapeHtml(`a & b <c> "d" 'e'`), 'a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;')
})

t('SEO: ทั้งสองภาษามีฟิลด์ครบ และ description ไม่ยาวจน Google ตัดทิ้งมาก', () => {
  for (const lang of ['th', 'en']) {
    const s = SEO[lang]
    for (const key of ['title', 'description', 'ogLocale', 'imageAlt', 'heading', 'jsRequired']) {
      assert.ok(typeof s[key] === 'string' && s[key].length > 0, `${lang}.${key}`)
    }
    assert.ok(s.features.length >= 3, `${lang}.features`)
    assert.ok(s.title.includes('FormatPritty'), `${lang}.title มีชื่อแบรนด์`)
    assert.ok(s.title.includes('JSON'), `${lang}.title มีคำว่า JSON`)
    assert.ok(s.description.length <= 200, `${lang}.description ${s.description.length} ตัวอักษร`)
  }
  assert.equal(SEO.th.features.length, SEO.en.features.length)
})

t('renderPage th ไม่มี SITE_URL: มีแท็กพื้นฐาน ไม่มีแท็กที่ต้องใช้ URL เต็ม', () => {
  const html = renderPage(SOURCE, 'th', null)
  assert.ok(html.includes('<html lang="th">'))
  assert.equal(attr(html, /<title>([^<]*)<\/title>/), escapeHtml(SEO.th.title))
  assert.equal(attr(html, /<meta name="description" content="([^"]*)"/), escapeHtml(SEO.th.description))
  assert.equal(attr(html, /<meta property="og:title" content="([^"]*)"/), escapeHtml(SEO.th.title))
  assert.equal(attr(html, /<meta property="og:locale" content="([^"]*)"/), 'th_TH')
  assert.equal(attr(html, /<meta property="og:locale:alternate" content="([^"]*)"/), 'en_US')
  assert.equal(attr(html, /<meta name="twitter:card" content="([^"]*)"/), 'summary')
  const head = html.slice(0, html.indexOf('</head>'))
  for (const missing of ['rel="canonical"', 'hreflang', 'og:url', 'og:image']) {
    assert.ok(!head.includes(missing), `ไม่ควรมี ${missing}`)
  }
  assert.ok(!html.includes('<!--seo:'), 'marker ต้องถูกแทนที่หมด')
  const ld = jsonLd(html)
  assert.equal(ld['@type'], 'WebApplication')
  assert.equal(ld.inLanguage, 'th')
  assert.equal(ld.url, undefined)
  assert.deepEqual(ld.featureList, SEO.th.features)
})

t('renderPage en มี SITE_URL: canonical ชี้ตัวเอง + hreflang ครบ + og:image เต็ม', () => {
  const html = renderPage(SOURCE, 'en', SITE)
  assert.ok(html.includes('<html lang="en">'))
  assert.ok(!html.includes('<html lang="th">'))
  assert.equal(attr(html, /<title>([^<]*)<\/title>/), escapeHtml(SEO.en.title))
  assert.equal(attr(html, /<link rel="canonical" href="([^"]*)"/), `${SITE}/?lang=en`)
  assert.equal(attr(html, /<meta property="og:url" content="([^"]*)"/), `${SITE}/?lang=en`)
  assert.equal(attr(html, /hreflang="th" href="([^"]*)"/), `${SITE}/`)
  assert.equal(attr(html, /hreflang="en" href="([^"]*)"/), `${SITE}/?lang=en`)
  assert.equal(attr(html, /hreflang="x-default" href="([^"]*)"/), `${SITE}/`)
  assert.equal(attr(html, /<meta property="og:image" content="([^"]*)"/), `${SITE}/og-image.png`)
  assert.equal(attr(html, /<meta property="og:image:width" content="([^"]*)"/), '1200')
  assert.equal(attr(html, /<meta property="og:image:height" content="([^"]*)"/), '630')
  assert.equal(attr(html, /<meta property="og:locale" content="([^"]*)"/), 'en_US')
  assert.equal(attr(html, /<meta name="twitter:card" content="([^"]*)"/), 'summary_large_image')
  const ld = jsonLd(html)
  assert.equal(ld.url, `${SITE}/?lang=en`)
  assert.equal(ld.inLanguage, 'en')
})

t('renderPage th มี SITE_URL: canonical เป็น URL หลัก (ไม่มี ?lang)', () => {
  const html = renderPage(SOURCE, 'th', SITE)
  assert.equal(attr(html, /<link rel="canonical" href="([^"]*)"/), `${SITE}/`)
  assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, 3)
})

t('renderPage: noscript มีหัวข้อ ฟีเจอร์ และลิงก์ไปอีกภาษา', () => {
  const th = renderPage(SOURCE, 'th', null)
  const noscript = th.match(/<noscript>([\s\S]*?)<\/noscript>/)[1]
  assert.ok(noscript.includes(`<h1>${escapeHtml(SEO.th.heading)}</h1>`))
  for (const feature of SEO.th.features) assert.ok(noscript.includes(escapeHtml(feature)))
  assert.ok(noscript.includes('href="/?lang=en"'))
  assert.ok(noscript.includes('hreflang="en"'))
  const en = renderPage(SOURCE, 'en', null)
  assert.ok(en.includes('href="/"'))
  assert.ok(en.includes('hreflang="th"'))
  // อยู่ใน #root — React ล้างทิ้งตอน mount เมื่อเปิด JavaScript
  assert.ok(/<div id="root"><noscript>/.test(th))
})

t('renderPage: JSON-LD ปิด </script> ก่อนเวลาไม่ได้', () => {
  const html = renderPage(SOURCE, 'th', SITE)
  const body = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
  assert.ok(!body.includes('<'), 'ต้อง escape < เป็น \\u003c')
})

t('renderPage: ไม่มี marker = throw (กันแก้ index.html แล้วแท็ก SEO หายเงียบ ๆ)', () => {
  assert.throws(() => renderPage('<html lang="th"><head></head></html>', 'th', null), /seo:head/)
  assert.throws(
    () => renderPage('<html lang="th"><head><!--seo:head--></head></html>', 'th', null),
    /seo:noscript/
  )
  assert.throws(() => renderPage(SOURCE.replace('<html lang="th">', '<html>'), 'en', null), /lang/)
})

t('renderRobots: อนุญาตทั้งเว็บ + Sitemap เฉพาะเมื่อมี SITE_URL', () => {
  assert.equal(renderRobots(null), 'User-agent: *\nAllow: /\n')
  assert.equal(
    renderRobots(SITE),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
  )
})

t('renderSitemap: สอง URL พร้อม hreflang ของกันและกัน', () => {
  const xml = renderSitemap(SITE)
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])
  assert.deepEqual(locs, [`${SITE}/`, `${SITE}/?lang=en`])
  assert.equal((xml.match(/<xhtml:link /g) ?? []).length, 6)
  assert.equal((xml.match(/<url>/g) ?? []).length, (xml.match(/<\/url>/g) ?? []).length)
})

done()
