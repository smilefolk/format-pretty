import { useCallback, useEffect, useRef } from 'react'

// container ของ options panel — จอกว้างเป็นคอลัมน์ขวาปกติ, จอแคบ (<1180) เป็น drawer ทับเนื้อหา
// เปิดแล้วย้าย focus เข้าไป ปิดด้วย Esc / คลิก scrim แล้วคืน focus ให้ปุ่มที่เปิด
export default function OptionsDrawer({ open, onClose, returnFocusTo, containerRef, hasOptions }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    // รอให้ class .open ถูกวาดก่อน (element ที่ visibility:hidden รับ focus ไม่ได้)
    const timer = setTimeout(() => {
      const panel = panelRef.current
      const focusable = panel?.querySelector('button, [href], input, select, textarea, [tabindex]')
      ;(focusable || panel)?.focus()
    }, 0)
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      returnFocusTo?.current?.focus()
    }
  }, [open, onClose, returnFocusTo])

  const setRefs = useCallback(
    (el) => {
      panelRef.current = el
      containerRef(el)
    },
    [containerRef]
  )

  return (
    <>
      {open && <div className="shell-scrim" onClick={onClose} />}
      <div
        id="shell-options"
        className={`shell-options${open ? ' open' : ''}${hasOptions ? ' has-content' : ''}`}
        tabIndex={-1}
        ref={setRefs}
      />
    </>
  )
}
