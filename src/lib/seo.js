// SEO ต่อภาษา — ข้อความชุดเดียวใช้สองที่:
// - ตอน build: plugin ใน vite.config.js แทน <!--seo:head--> / <!--seo:noscript--> ใน index.html
//   แล้วสร้าง index.html (ไทย, URL หลัก `/`) กับ index.en.html (อังกฤษ — nginx เสิร์ฟให้ `/?lang=en`)
//   + robots.txt และ sitemap.xml
// - ตอนรัน: i18n อ่าน/เขียน `?lang` และ App ตั้ง document.title ตามภาษาที่เลือก
// ไม่มีโค้ดเฉพาะ node ในไฟล์นี้ — เข้า bundle ของเบราว์เซอร์ได้ (ส่วนที่ไม่ได้ใช้ถูก tree-shake ทิ้ง)

export const SITE_NAME = 'FormatPritty'

export const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 }

export const SEO = {
  th: {
    title: 'จัดรูปแบบ JSON ออนไลน์ — ตรวจสอบ เปรียบเทียบ แกะสตริง | FormatPritty',
    description:
      'จัดรูปแบบ ตรวจสอบ และย่อขนาด JSON บอกจุดผิดเป็นภาษาไทยพร้อมแก้ให้อัตโนมัติ เปรียบเทียบ JSON สองก้อน และแกะ JSON ที่ถูก escape เป็นสตริง — ทำงานในเบราว์เซอร์ ข้อมูลไม่ออกนอกเครื่อง',
    ogLocale: 'th_TH',
    imageAlt: 'FormatPritty — จัดรูปแบบ ตรวจสอบ เปรียบเทียบ และแกะสตริง JSON',
    heading: 'FormatPritty — เครื่องมือ JSON ที่ทำงานในเบราว์เซอร์',
    features: [
      'จัดรูปแบบและย่อขนาด JSON ตรวจสอบสดขณะพิมพ์ บอกบรรทัดและคอลัมน์ที่ผิด พร้อมแก้ให้อัตโนมัติ',
      'เปรียบเทียบ JSON สองก้อนแบบลึกทุกระดับ จับคู่รายการในอาร์เรย์ด้วยลำดับหรือด้วยคีย์',
      'แกะ JSON ที่ถูก escape เป็นสตริงกลับเป็นข้อมูลจริง รวมถึงสตริง JSON ที่ซ้อนอยู่ในฟิลด์ย่อย',
    ],
    jsRequired: 'เปิด JavaScript ในเบราว์เซอร์เพื่อใช้งาน — ข้อมูลที่วางลงไปไม่ถูกส่งออกนอกเครื่อง',
    otherLang: 'English',
  },
  en: {
    title: 'JSON Formatter, Validator & Diff Online | FormatPritty',
    description:
      'Format, validate and minify JSON with exact error locations and one-click fixes, diff two JSON documents, and unescape stringified JSON — all in your browser, nothing is uploaded.',
    ogLocale: 'en_US',
    imageAlt: 'FormatPritty — format, validate, diff and unescape JSON',
    heading: 'FormatPritty — JSON tools that run in your browser',
    features: [
      'Format and minify JSON with live validation, exact line and column errors, and one-click fixes',
      'Deep-diff two JSON documents, matching array items by index or by key',
      'Unescape stringified JSON back into data, including JSON strings nested inside fields',
    ],
    jsRequired: 'Enable JavaScript to use FormatPritty — nothing you paste ever leaves your device.',
    otherLang: 'ภาษาไทย',
  },
}

const isLang = (value) => Object.hasOwn(SEO, value)
const otherLang = (lang) => (lang === 'en' ? 'th' : 'en')

// ภาษาจาก query string (`?lang=en`) — null ถ้าไม่ได้ระบุหรือไม่รู้จัก
export function langFromSearch(search) {
  const value = new URLSearchParams(search).get('lang')
  return isLang(value) ? value : null
}

// search string หลังสลับภาษา: อังกฤษ = `?lang=en`, ไทย = ไม่มี `lang` (URL หลัก) — พารามิเตอร์อื่นคงไว้
export function searchForLang(search, lang) {
  const params = new URLSearchParams(search)
  if (lang === 'en') params.set('lang', 'en')
  else params.delete('lang')
  const query = params.toString()
  return query ? `?${query}` : ''
}

// URL ของหน้าตามภาษา — `base` ว่างได้ (ลิงก์แบบ relative ใน noscript)
export const pageUrl = (lang, base = '') => `${base}/${searchForLang('', lang)}`

// SITE_URL จาก env ตอน build → origin (+ path ถ้ามี) ไม่มี / ท้าย; ว่าง = null (ไม่ใส่แท็กที่ต้องใช้ URL เต็ม)
export function normalizeSiteUrl(value) {
  const raw = (value ?? '').trim()
  if (!raw) return null
  let url
  try {
    url = new URL(raw)
  } catch {
    url = null
  }
  if (!url || !/^https?:$/.test(url.protocol) || url.search || url.hash) {
    throw new Error(`SITE_URL ต้องเป็น URL แบบ http(s) ไม่มี query/hash เช่น https://json.example.com (ได้ "${raw}")`)
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const meta = (attr, key, content) => `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
const link = (attrs) =>
  `<link ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ')} />`

// structured data (schema.org) — `<` ถูก escape กัน `</script>` ในข้อความปิดแท็กก่อนเวลา
function jsonLd(lang, siteUrl) {
  const s = SEO[lang]
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    ...(siteUrl && { url: pageUrl(lang, siteUrl) }),
    description: s.description,
    inLanguage: lang,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' },
    featureList: s.features,
  }
  const json = JSON.stringify(data).replaceAll('<', '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

export function renderHead(lang, siteUrl) {
  const s = SEO[lang]
  const other = SEO[otherLang(lang)]
  const tags = [
    `<title>${escapeHtml(s.title)}</title>`,
    meta('name', 'description', s.description),
  ]
  if (siteUrl) {
    tags.push(
      link({ rel: 'canonical', href: pageUrl(lang, siteUrl) }),
      link({ rel: 'alternate', hreflang: 'th', href: pageUrl('th', siteUrl) }),
      link({ rel: 'alternate', hreflang: 'en', href: pageUrl('en', siteUrl) }),
      link({ rel: 'alternate', hreflang: 'x-default', href: pageUrl('th', siteUrl) })
    )
  }
  tags.push(
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', s.title),
    meta('property', 'og:description', s.description),
    meta('property', 'og:locale', s.ogLocale),
    meta('property', 'og:locale:alternate', other.ogLocale)
  )
  // og:url / og:image ต้องเป็น URL เต็ม (scraper ของโซเชียลไม่ resolve path) — ไม่มี SITE_URL ก็ไม่ใส่
  if (siteUrl) {
    tags.push(
      meta('property', 'og:url', pageUrl(lang, siteUrl)),
      meta('property', 'og:image', `${siteUrl}${OG_IMAGE.path}`),
      meta('property', 'og:image:type', 'image/png'),
      meta('property', 'og:image:width', String(OG_IMAGE.width)),
      meta('property', 'og:image:height', String(OG_IMAGE.height)),
      meta('property', 'og:image:alt', s.imageAlt)
    )
  }
  tags.push(
    meta('name', 'twitter:card', siteUrl ? 'summary_large_image' : 'summary'),
    jsonLd(lang, siteUrl)
  )
  return tags.join('\n    ')
}

// เนื้อหาตอนปิด JavaScript (และ crawler ที่ไม่รัน JS) — วางใน #root ซึ่ง React ล้างทิ้งตอน mount
export function renderNoscript(lang) {
  const s = SEO[lang]
  const other = otherLang(lang)
  const items = s.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')
  return (
    `<noscript><div class="noscript">` +
    `<h1>${escapeHtml(s.heading)}</h1>` +
    `<p>${escapeHtml(s.description)}</p>` +
    `<ul>${items}</ul>` +
    `<p><strong>${escapeHtml(s.jsRequired)}</strong></p>` +
    `<p><a href="${pageUrl(other)}" hreflang="${other}" lang="${other}">${escapeHtml(s.otherLang)}</a></p>` +
    `</div></noscript>`
  )
}

function replaceOnce(html, marker, replacement) {
  if (!html.includes(marker)) {
    throw new Error(`ไม่พบ ${marker} ใน index.html — แท็ก SEO จะหายไปทั้งชุด`)
  }
  return html.replace(marker, () => replacement)
}

// index.html ต้นฉบับ → หน้าของภาษานั้น (ภาษาไทย = index.html, อังกฤษ = index.en.html)
export function renderPage(html, lang, siteUrl) {
  if (!/<html lang="[^"]*">/.test(html)) {
    throw new Error('ไม่พบ <html lang="…"> ใน index.html — ตั้งภาษาของหน้าไม่ได้')
  }
  let out = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
  out = replaceOnce(out, '<!--seo:head-->', renderHead(lang, siteUrl))
  out = replaceOnce(out, '<!--seo:noscript-->', renderNoscript(lang))
  return out
}

export function renderRobots(siteUrl) {
  const rules = 'User-agent: *\nAllow: /\n'
  return siteUrl ? `${rules}\nSitemap: ${siteUrl}/sitemap.xml\n` : rules
}

export function renderSitemap(siteUrl) {
  const alternates = ['th', 'en', 'x-default']
    .map((hreflang) => {
      const href = pageUrl(hreflang === 'x-default' ? 'th' : hreflang, siteUrl)
      return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}"/>`
    })
    .join('\n')
  const urls = ['th', 'en']
    .map((lang) => `  <url>\n    <loc>${escapeHtml(pageUrl(lang, siteUrl))}</loc>\n${alternates}\n  </url>`)
    .join('\n')
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${urls}\n</urlset>\n`
  )
}
