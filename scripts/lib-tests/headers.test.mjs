import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { suite } from './_harness.mjs'

// header ความปลอดภัยมีสองที่: nginx (Docker) กับ public/_headers (Cloudflare) — ต้องตรงกันทุกตัว
const { t, done } = suite('security headers (nginx ↔ Cloudflare _headers)')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (file) => readFileSync(join(ROOT, file), 'utf8')

function nginxHeaders() {
  const headers = new Map()
  for (const m of read('nginx-security-headers.conf').matchAll(/^add_header\s+(\S+)\s+"([^"]*)"\s+always;/gm)) {
    headers.set(m[1], m[2])
  }
  return headers
}

// _headers: บรรทัด path ชิดซ้าย ตามด้วย `  Name: value` ที่ย่อหน้า, # = คอมเมนต์
function cloudflareRules() {
  const rules = new Map()
  let current = null
  for (const line of read('public/_headers').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = new Map()
      rules.set(line.trim(), current)
      continue
    }
    const m = line.trim().match(/^([^:]+):\s*(.*)$/)
    assert.ok(current && m, `บรรทัดอ่านไม่ออก: ${line}`)
    current.set(m[1], m[2])
  }
  return rules
}

t('nginx มี header ครบชุดที่คาดไว้', () => {
  const names = [...nginxHeaders().keys()]
  assert.deepEqual(names.sort(), [
    'Content-Security-Policy',
    'Cross-Origin-Opener-Policy',
    'Permissions-Policy',
    'Referrer-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
  ])
})

t('_headers /* มี header ความปลอดภัยตรงกับ nginx ทุกตัว', () => {
  const all = cloudflareRules().get('/*')
  assert.ok(all, 'ต้องมีกฎ /*')
  assert.deepEqual(Object.fromEntries(all), Object.fromEntries(nginxHeaders()))
})

t('_headers: asset ที่มี hash และฟอนต์ cache 1 ปีแบบ immutable เหมือน nginx', () => {
  const rules = cloudflareRules()
  for (const path of ['/assets/*', '/fonts/*']) {
    assert.equal(rules.get(path)?.get('Cache-Control'), 'public, max-age=31536000, immutable', path)
  }
  assert.match(read('nginx.conf'), /location \/assets\/[\s\S]*?max-age=31536000, immutable/)
  assert.match(read('nginx.conf'), /location \/fonts\/[\s\S]*?max-age=31536000, immutable/)
})

done()
