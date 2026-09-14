import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { formatBytes } from '../lib/json'

// <textarea> ของเบราว์เซอร์ layout ข้อความทั้งก้อนใหม่ทุกครั้งที่เปลี่ยน (~20 µs/บรรทัด, ~0.4 ms/KB ถ้าบรรทัดเดียว)
// เกินเกณฑ์นี้จึงเปลี่ยนเป็น "โหมดตัวอย่าง": แสดงเฉพาะส่วนต้น อ่านอย่างเดียว — ผลลัพธ์/คัดลอก/ดาวน์โหลดยังใช้ทั้งก้อน
export const LARGE_CHARS = 512 * 1024
export const LARGE_LINES = 8000
const PREVIEW_CHARS = 64 * 1024

// ช่องแก้ไขข้อความพร้อมเลขบรรทัด และไฮไลต์บรรทัดที่ผิดพลาด
// - ref.focusLine(n): focus + วาง caret ต้นบรรทัด n + เลื่อนให้เห็น (ปุ่ม "ไปที่บรรทัด" ในการ์ด error)
// - dense: mono 11.5px/1.75 สำหรับ pane เตี้ย (หน้า Diff) · wrap: ตัดบรรทัดยาว (หน้า Unwrap)
// - labelledBy: id ของ PaneHead ที่เป็นชื่อของ textarea (aria-labelledby) — ทุกหน้าต้องส่ง
// - invalid: ทำเครื่องหมาย aria-invalid (ไม่ผูกกับ errorLine เพราะ error บางแบบไม่มีตำแหน่ง)
// textarea เป็น uncontrolled โดยตั้งใจ: React controlled จะเขียน node.defaultValue (= text content ทั้งก้อน) ทุก render
// ซึ่งกับเอกสารหลาย MB กินเวลาเป็นวินาทีต่อคีย์ — จึง sync `value` ลง DOM เองเฉพาะเมื่อต่างจากที่พิมพ์อยู่
// (จัดรูปแบบ / ตัวอย่าง / เปิดไฟล์ / ⌘K) ผลข้างเคียง: SSR ได้ textarea ว่าง (แอปไม่ hydrate จึงไม่มีปัญหา)
const Editor = forwardRef(function Editor(
  {
    value,
    onChange,
    errorLine,
    placeholder,
    onDropFile,
    onKeyDown,
    labelledBy,
    invalid = false,
    dense = false,
    wrap = false,
  },
  ref
) {
  const gutterRef = useRef(null)
  const textareaRef = useRef(null)
  // นับชั้น dragenter/dragleave เพราะ dragleave ยิงทุกครั้งที่เมาส์ข้ามขอบ element ลูก
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const t = useT()
  const totalLines = value.split('\n').length
  const large = value.length > LARGE_CHARS || totalLines > LARGE_LINES
  const shown = large ? value.slice(0, PREVIEW_CHARS) : value
  const lines = large ? shown.split('\n').length : totalLines

  // useEffect (ไม่ใช่ layout effect) พอ: textarea เริ่มว่างและไม่มีอะไรวัดขนาดมันก่อน paint; แถม SSR ไม่บ่น
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && textarea.value !== shown) textarea.value = shown
  }, [shown])

  useImperativeHandle(
    ref,
    () => ({
      focusLine(line) {
        const textarea = textareaRef.current
        if (!textarea) return
        const n = Math.max(1, Math.min(line, lines))
        const index = value.split('\n', n - 1).join('\n').length + (n > 1 ? 1 : 0)
        textarea.focus()
        textarea.setSelectionRange(index, index)
        // เลื่อนให้บรรทัดอยู่กลางช่อง (textarea ไม่มี scrollIntoView ต่อบรรทัด)
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20
        textarea.scrollTop = Math.max(0, (n - 1) * lineHeight - textarea.clientHeight / 2)
        if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop
      },
    }),
    [value, lines]
  )

  const handleDragEnter = (e) => {
    if (!onDropFile) return
    e.preventDefault()
    dragDepth.current++
    setDragging(true)
  }
  const handleDragLeave = () => {
    if (!onDropFile) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }
  const handleDrop = (e) => {
    if (!onDropFile) return
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    onDropFile(e.dataTransfer.files?.[0])
  }

  const className = ['editor', dense && 'dense', wrap && 'wrap', dragging && 'dragging']
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {large && (
        <div className="editor-notice" role="status">
          {t(
            `เอกสารใหญ่ (${formatBytes(value.length)}, ${totalLines.toLocaleString()} บรรทัด) — แสดงเฉพาะ ${formatBytes(PREVIEW_CHARS)} แรกและปิดการแก้ไข ผลลัพธ์ คัดลอก ดาวน์โหลด ยังใช้ทั้งก้อน; ล้างหรือเปิดไฟล์ใหม่เพื่อเปลี่ยนเนื้อหา`,
            `Large document (${formatBytes(value.length)}, ${totalLines.toLocaleString()} lines) — showing the first ${formatBytes(PREVIEW_CHARS)} read-only; output, copy and download still use the whole text. Clear or open another file to replace it.`
          )}
        </div>
      )}
      <div
        className={className}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className={errorLine === i + 1 ? 'error-line' : undefined}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code input"
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-labelledby={labelledBy}
          aria-invalid={invalid || undefined}
          readOnly={large}
          spellCheck={false}
        />
      </div>
    </>
  )
})

export default Editor
