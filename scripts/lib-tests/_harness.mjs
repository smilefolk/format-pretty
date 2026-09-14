// harness เล็ก ๆ ที่ทุกไฟล์เทสต์ใช้ร่วม: suite(name) → { t, done } — ล้มเคสแรกแล้วหยุด (พิมพ์ชื่อเคสก่อน throw)
export function suite(name) {
  let passed = 0
  return {
    t(label, fn) {
      try {
        fn()
        passed++
      } catch (error) {
        console.error(`FAIL: ${name} — ${label}`)
        throw error
      }
    },
    done() {
      console.log(`${name}: ${passed} cases passed`)
    },
  }
}
