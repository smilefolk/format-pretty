// action ของแต่ละหน้า รวมไว้ที่เดียว — ปุ่มในหน้าและ command palette (lib/commands.js) เรียกฟังก์ชันเดียวกัน
//
// - useFormatterActions / useCompareActions / useUnwrapActions: หน้าเป็นคนถือ result/output อยู่แล้ว
//   จึงส่งค่าเหล่านั้นเข้ามาแล้วได้ object ของ action กลับไป (memo ตาม input)
// - usePublishActions(actions): หน้าที่ active ส่ง action ของตัวเองเข้า registry (ref — ไม่ re-render)
//   palette อ่านตอนสั่งงานผ่าน ctx.actions

import { createContext, useContext, useEffect, useMemo } from 'react'
import {
  SAMPLE_DIFF_LEFT,
  SAMPLE_DIFF_RIGHT,
  SAMPLE_FORMAT,
  SAMPLE_FORMAT_MULTI,
  SAMPLE_UNWRAP,
  SAMPLE_UNWRAP_NESTED,
} from '../lib/samples'

// ---- helper ที่ทุกหน้าใช้ร่วม ------------------------------------------------

export async function copyText(text, notify, done = 'คัดลอกไปยังคลิปบอร์ดแล้ว') {
  try {
    await navigator.clipboard.writeText(text)
    notify(done)
  } catch {
    notify('คัดลอกไม่สำเร็จ')
  }
}

export function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// onText(text, fileName) — หน้าใช้ fileName ตั้งชื่อ tab (App.onFileName) ถ้า doc ยังชื่อ "เอกสาร n"
export function readTextFile(file, onText, notify) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    onText(String(reader.result), file.name)
    notify(`โหลดไฟล์ ${file.name} แล้ว`)
  }
  reader.readAsText(file)
}

// ---- registry ---------------------------------------------------------------

// ค่าใน context คือ ref ({ current }) ที่ App ถือ — เปลี่ยน current ได้โดยไม่ต้อง re-render ทั้งแอป
export const ActionsContext = createContext({ current: {} })

export function usePublishActions(actions) {
  const registry = useContext(ActionsContext)
  useEffect(() => {
    registry.current = actions
    return () => {
      if (registry.current === actions) registry.current = {}
    }
  }, [registry, actions])
}

// ---- Formatter ----------------------------------------------------------------

export function useFormatterActions({ result, output, value, fix, setInput, notify, openFile }) {
  return useMemo(
    () => ({
      format() {
        if (!result.ok) return notify('JSON ไม่ถูกต้อง จัดรูปแบบไม่ได้')
        setInput(output)
        notify('จัดรูปแบบเรียบร้อย')
      },
      minify() {
        if (!result.ok) return notify('JSON ไม่ถูกต้อง ย่อขนาดไม่ได้')
        setInput(JSON.stringify(value))
        notify('ย่อขนาดเรียบร้อย')
      },
      copy() {
        if (!output) return notify('ยังไม่มีผลลัพธ์ให้คัดลอก')
        copyText(output, notify)
      },
      download() {
        if (!output) return notify('ยังไม่มีผลลัพธ์ให้ดาวน์โหลด')
        downloadText(output, 'formatted.json')
      },
      openFile,
      clear() {
        setInput('')
      },
      // D7: ไม่ auto-apply — ผู้ใช้กดเอง แล้วแจ้งให้ตรวจสอบ; เป็น null เมื่อแก้ไม่ได้ (ปุ่ม/คำสั่งซ่อน)
      fix: fix
        ? () => {
            setInput(fix.fixed)
            notify(`แก้ ${fix.applied.length} จุด — ตรวจสอบก่อนใช้`)
          }
        : null,
      sample() {
        setInput(SAMPLE_FORMAT)
      },
      sampleMulti() {
        setInput(SAMPLE_FORMAT_MULTI)
      },
    }),
    [result.ok, output, value, fix, setInput, notify, openFile]
  )
}

// ---- Compare ------------------------------------------------------------------

export function useCompareActions({
  left,
  right,
  setLeft,
  setRight,
  ready,
  diffs,
  toReport,
  notify,
  openFileLeft,
  openFileRight,
}) {
  return useMemo(
    () => ({
      openFileLeft,
      openFileRight,
      swap() {
        setLeft(right)
        setRight(left)
      },
      copyReport() {
        if (!ready) return notify('ต้องมี JSON ที่ถูกต้องทั้งสองฝั่งก่อน')
        copyText(toReport(diffs), notify, 'คัดลอกรายงานแล้ว')
      },
      copyPath(path) {
        copyText(path, notify, `คัดลอก ${path} แล้ว`)
      },
      sample() {
        setLeft(SAMPLE_DIFF_LEFT)
        setRight(SAMPLE_DIFF_RIGHT)
      },
      clear() {
        setLeft('')
        setRight('')
      },
    }),
    [left, right, setLeft, setRight, ready, diffs, toReport, notify, openFileLeft, openFileRight]
  )
}

// ---- Unwrap -------------------------------------------------------------------

export function useUnwrapActions({
  input,
  result,
  output,
  layers,
  setInput,
  notify,
  sendToFormatter,
  openFile,
}) {
  return useMemo(
    () => ({
      openFile,
      // D5(a): แกะแล้วเขียนผลทับช่องซ้าย
      unwrap() {
        if (!result.ok) return notify(result.empty ? 'ยังไม่มีข้อมูลให้แกะ' : 'แกะเป็น JSON ไม่ได้')
        if (layers === 0) return notify('ข้อมูลนี้เป็น JSON อยู่แล้ว ไม่ต้องแกะ')
        setInput(output)
        notify(`แกะสตริง ${layers} ชั้นเรียบร้อย`)
      },
      copy() {
        if (!output) return notify('ยังไม่มีผลลัพธ์ให้คัดลอก')
        copyText(output, notify)
      },
      download() {
        if (!output) return notify('ยังไม่มีผลลัพธ์ให้ดาวน์โหลด')
        downloadText(output, 'unwrapped.json')
      },
      sendToFormatter() {
        if (!output) return notify('ยังไม่มีผลลัพธ์')
        sendToFormatter(output)
      },
      clear() {
        setInput('')
      },
      // ปุ่ม "ตัวอย่าง" ในหน้าสลับสองชุด; palette มีแยกเป็นสองคำสั่ง
      sample() {
        setInput(input === SAMPLE_UNWRAP ? SAMPLE_UNWRAP_NESTED : SAMPLE_UNWRAP)
      },
      sampleSimple() {
        setInput(SAMPLE_UNWRAP)
      },
      sampleNested() {
        setInput(SAMPLE_UNWRAP_NESTED)
      },
    }),
    [input, result.ok, result.empty, output, layers, setInput, notify, sendToFormatter, openFile]
  )
}
