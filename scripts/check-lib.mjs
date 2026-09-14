#!/usr/bin/env node
// รัน node test ของ src/lib โดยไม่ต้องเปิดเบราว์เซอร์และไม่เพิ่ม dependency
// โค้ดจริง import แบบไม่มีนามสกุล (พึ่ง vite) จึงลงทะเบียน resolve hook ที่เติม .js ให้ก่อน แล้ว import เทสต์ใน scripts/lib-tests/
import { readdirSync } from 'node:fs'
import { register } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

register('./resolve-js-hooks.mjs', import.meta.url)

const dir = join(dirname(fileURLToPath(import.meta.url)), 'lib-tests')
const tests = readdirSync(dir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()

let failed = 0
for (const file of tests) {
  try {
    await import(pathToFileURL(join(dir, file)).href)
  } catch (error) {
    failed++
    console.error(`✗ ${file}\n${error.stack ?? error}`)
  }
}
console.log(failed ? `\n${failed} test file(s) failed` : `\nall ${tests.length} test files passed`)
process.exit(failed ? 1 : 0)
