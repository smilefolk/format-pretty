import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

// ช่องแก้ไขข้อความพร้อมเลขบรรทัด และไฮไลต์บรรทัดที่ผิดพลาด
// - ref.focusLine(n): focus + วาง caret ต้นบรรทัด n + เลื่อนให้เห็น (ปุ่ม "ไปที่บรรทัด" ในการ์ด error)
// - dense: mono 11.5px/1.75 สำหรับ pane เตี้ย (หน้า Diff) · wrap: ตัดบรรทัดยาว (หน้า Unwrap)
// - labelledBy: id ของ PaneHead ที่เป็นชื่อของ textarea (aria-labelledby) — ทุกหน้าต้องส่ง
// - invalid: ทำเครื่องหมาย aria-invalid (ไม่ผูกกับ errorLine เพราะ error บางแบบไม่มีตำแหน่ง)
// - onPasteText(text, replacesAll): ข้อความดิบจากคลิปบอร์ด (ยังมี \r\n) ก่อนที่ textarea จะ normalize —
//   replacesAll = ช่องว่างหรือเลือกทั้งหมดอยู่ จึงถือว่าเป็นการ "นำเข้าใหม่" (ใช้ตั้งธง line ending)
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
    onPasteText,
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
  const lines = value.split('\n').length

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
  const handlePaste = (e) => {
    if (!onPasteText) return
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    const ta = e.currentTarget
    const replacesAll = value === '' || (ta.selectionStart === 0 && ta.selectionEnd === value.length)
    onPasteText(text, replacesAll)
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop
        }}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        spellCheck={false}
      />
    </div>
  )
})

export default Editor
