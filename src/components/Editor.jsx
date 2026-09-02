import { useRef } from 'react'

// ช่องแก้ไขข้อความพร้อมเลขบรรทัด และไฮไลต์บรรทัดที่ผิดพลาด
export default function Editor({ value, onChange, errorLine, placeholder, onDropFile, onKeyDown }) {
  const gutterRef = useRef(null)
  const lines = value.split('\n').length

  const handleDrop = (e) => {
    if (!onDropFile) return
    e.preventDefault()
    onDropFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="editor" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={errorLine === i + 1 ? 'error-line' : undefined}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        className="code input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  )
}
