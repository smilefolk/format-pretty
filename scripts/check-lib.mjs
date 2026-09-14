#!/usr/bin/env node
// รัน node test ของ src/lib โดยไม่ต้องเปิดเบราว์เซอร์และไม่เพิ่ม dependency
// โค้ดจริง import แบบไม่มีนามสกุล (พึ่ง vite) จึงคัดลอก src/lib ไป .lib-tmp/ พร้อมเติม .js ก่อน แล้วรันเทสต์ใน scripts/lib-tests/
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src', 'lib')
const tmp = join(root, '.lib-tmp')

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp)
for (const file of readdirSync(src)) {
  if (!file.endsWith('.js')) continue // i18n.jsx ไม่มีเทสต์ฝั่ง node
  const code = readFileSync(join(src, file), 'utf8').replace(
    /from '\.\/([\w-]+)'/g,
    "from './$1.js'"
  )
  writeFileSync(join(tmp, file), code)
}

let failed = 0
const tests = readdirSync(join(root, 'scripts', 'lib-tests'))
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()
for (const file of tests) {
  try {
    await import(pathToFileURL(join(root, 'scripts', 'lib-tests', file)).href)
  } catch (error) {
    failed++
    console.error(`✗ ${file}\n${error.stack ?? error}`)
  }
}
rmSync(tmp, { recursive: true, force: true })
console.log(failed ? `\n${failed} test file(s) failed` : `\nall ${tests.length} test files passed`)
process.exit(failed ? 1 : 0)
