import assert from 'node:assert/strict'
import { fixJson } from '../../.lib-tmp/fix.js'
import { parseJson } from '../../.lib-tmp/json.js'

let n = 0
const t = (name, fn) => {
  try {
    fn()
    n++
  } catch (e) {
    console.error('FAIL:', name)
    throw e
  }
}
const ok = (text) => {
  const r = fixJson(text)
  assert.ok(r, 'expected a fix')
  assert.equal(parseJson(r.fixed).ok, true, 'fixed text must parse')
  return r
}

t('1. trailing comma before } and ] (with whitespace/newline)', () => {
  assert.deepEqual(ok('{"a":1,}'), { fixed: '{"a":1}', applied: ['trailing-comma'] })
  assert.deepEqual(ok('[1,2, ]'), { fixed: '[1,2 ]', applied: ['trailing-comma'] })
  assert.deepEqual(ok('{\n  "a": 1,\n}'), { fixed: '{\n  "a": 1\n}', applied: ['trailing-comma'] })
})
t('2. double comma in object and array', () => {
  assert.deepEqual(ok('{"a":1,,"b":2}'), { fixed: '{"a":1,"b":2}', applied: ['double-comma'] })
  assert.deepEqual(ok('[1,,2]'), { fixed: '[1,2]', applied: ['double-comma'] })
  assert.deepEqual(ok('[1, ,2]').fixed, '[1, 2]')
})
t('3. single quotes on keys and values; escapes handled', () => {
  assert.deepEqual(ok(`{'a':'x'}`), {
    fixed: '{"a":"x"}',
    applied: ['single-quote', 'single-quote'],
  })
  const r = ok(`{"a":'it\\'s "q"'}`)
  assert.equal(r.fixed, `{"a":"it's \\"q\\""}`)
  assert.equal(JSON.parse(r.fixed).a, `it's "q"`)
})
t('4. unquoted identifier keys', () => {
  assert.deepEqual(ok('{a:1}'), { fixed: '{"a":1}', applied: ['unquoted-key'] })
  assert.deepEqual(ok('{ $id_1 : 1, b2:"x"}').fixed, '{ "$id_1" : 1, "b2":"x"}')
})
t("5. mixed: {'a':1,}", () => {
  assert.deepEqual(ok(`{'a':1,}`), {
    fixed: '{"a":1}',
    applied: ['single-quote', 'trailing-comma'],
  })
})
t('6. mixed: {a:1,,b:2}', () => {
  assert.deepEqual(ok('{a:1,,b:2}'), {
    fixed: '{"a":1,"b":2}',
    applied: ['unquoted-key', 'double-comma', 'unquoted-key'],
  })
})
t('7. null: unclosed string', () => {
  assert.equal(fixJson('{"a":"x}'), null)
})
t('8. null: unbalanced brackets / missing comma / garbage', () => {
  assert.equal(fixJson('{"a":[1}'), null)
  assert.equal(fixJson('{"a":1 "b":2}'), null)
  assert.equal(fixJson('hello'), null)
  assert.equal(fixJson('{"a":1'), null)
})
t('9. guard: apostrophe inside a valid string is untouched', () => {
  assert.deepEqual(ok(`{"note":"it's ok",}`), {
    fixed: `{"note":"it's ok"}`,
    applied: ['trailing-comma'],
  })
})
t('valid or empty input → null (nothing to fix)', () => {
  assert.equal(fixJson('{"a":1}'), null)
  assert.equal(fixJson('   '), null)
})
t('more than 5 errors → null (never returns unparsable text)', () => {
  assert.equal(fixJson('{a:1,b:2,c:3,d:4,e:5,f:6}'), null)
  assert.ok(fixJson('{a:1,b:2,c:3,d:4,e:5}'))
})
t('NDJSON with errors in each chunk is fixed chunk by chunk (merge stays on)', () => {
  const r = ok(`{'a':1}\n{"b":2,}`)
  assert.equal(r.fixed, `{"a":1}\n{"b":2}`)
  assert.deepEqual(r.applied, ['single-quote', 'trailing-comma'])
})
console.log(`fix.js: ${n} cases passed`)
