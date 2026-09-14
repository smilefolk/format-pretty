import { useEffect, useRef, useState } from 'react'
import { useT } from '../../lib/i18n'
import { parseJson } from '../../lib/json'
import { unwrapJson } from '../../lib/unwrap'

// สถานะของ doc สำหรับจุดหน้าชื่อ: ok (มินต์) / danger (แดง) / empty (เทา)
export function docStatus(doc) {
  const of = (result) => (result.empty ? 'empty' : result.ok ? 'ok' : 'danger')
  if (doc.tool === 'compare') {
    const sides = [parseJson(doc.left), parseJson(doc.right)].map(of)
    if (sides.includes('danger')) return 'danger'
    if (sides.includes('empty')) return 'empty'
    return 'ok'
  }
  if (doc.tool === 'unwrap') return of(unwrapJson(doc.input))
  return of(parseJson(doc.input, { merge: doc.mergeChunks }))
}

// คำนวณสถานะเฉพาะ doc ที่เนื้อหาเปลี่ยน (ปกติคืออันที่กำลังพิมพ์) — อันอื่นใช้ผลที่ cache ไว้
function useDocStatuses(docs) {
  const cache = useRef(new Map())
  const statuses = {}
  const seen = new Set()
  for (const doc of docs) {
    seen.add(doc.id)
    const hit = cache.current.get(doc.id)
    const changed =
      !hit ||
      hit.input !== doc.input ||
      hit.left !== doc.left ||
      hit.right !== doc.right ||
      hit.mergeChunks !== doc.mergeChunks
    const status = changed ? docStatus(doc) : hit.status
    if (changed) {
      cache.current.set(doc.id, {
        input: doc.input,
        left: doc.left,
        right: doc.right,
        mergeChunks: doc.mergeChunks,
        status,
      })
    }
    statuses[doc.id] = status
  }
  for (const id of cache.current.keys()) if (!seen.has(id)) cache.current.delete(id)
  return statuses
}

// แท็บเอกสารใน top bar — tab ที่ active เชื่อมกับ pane ข้างล่าง (margin-bottom -1px)
export default function DocTabs({ docs, activeId, onActivate, onClose, onOpen, onRename }) {
  const t = useT()
  const statuses = useDocStatuses(docs)
  const listRef = useRef(null)
  const [editingId, setEditingId] = useState(null)

  // tab ที่ active เลื่อนเข้ามาให้เห็นเสมอเมื่อแถบล้น
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [activeId, docs.length])

  // คีย์บอร์ดบน tab: ← → เลื่อน (roving tabindex), Delete/Backspace ปิด, F2 เปลี่ยนชื่อ
  // (ปุ่ม × เป็นแค่ affordance ของเมาส์ — role=tab ห้ามมี interactive ซ้อนข้างใน)
  const onKeyDown = (event) => {
    if (editingId) return
    const index = docs.findIndex((d) => d.id === activeId)
    if (index < 0) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onClose(activeId)
      return
    }
    if (event.key === 'F2') {
      event.preventDefault()
      if (onRename) setEditingId(activeId)
      return
    }
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = docs[(index + step + docs.length) % docs.length]
    onActivate(next.id)
    listRef.current?.querySelector(`[data-id="${next.id}"]`)?.focus()
  }

  const commitRename = (id, value) => {
    setEditingId(null)
    if (onRename && value.trim()) onRename(id, value)
  }

  // tablist ครอบเฉพาะ tab (ARIA ไม่ให้มีลูกชนิดอื่น) — ปุ่ม + เป็นพี่น้องในกล่องเลื่อนเดียวกัน
  return (
    <div className="doc-tabs" ref={listRef} onKeyDown={onKeyDown}>
      <div className="doc-tab-list" role="tablist" aria-label={t('เอกสาร', 'Documents')}>
        {docs.map((doc) => {
          const active = doc.id === activeId
          return (
            <div
              key={doc.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              data-id={doc.id}
              title={t(
                'ดับเบิลคลิกหรือ F2 เปลี่ยนชื่อ · Delete ปิด',
                'Double-click or F2 to rename · Delete to close'
              )}
              className={active ? 'doc-tab active' : 'doc-tab'}
              onClick={() => onActivate(doc.id)}
              onDoubleClick={() => onRename && setEditingId(doc.id)}
              onAuxClick={(event) => {
                // คลิกกลางปิด tab
                if (event.button === 1) onClose(doc.id)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onActivate(doc.id)
                }
              }}
            >
              <span className={`doc-tab-dot ${statuses[doc.id]}`} aria-hidden="true" />
              {editingId === doc.id ? (
                <input
                  className="doc-tab-name-input"
                  defaultValue={doc.name}
                  autoFocus
                  aria-label={t('ชื่อเอกสาร', 'Document name')}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={(event) => commitRename(doc.id, event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === 'Enter') commitRename(doc.id, event.currentTarget.value)
                    if (event.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <span className="doc-tab-name">{doc.name}</span>
              )}
              <span
                className="doc-tab-close"
                aria-hidden="true"
                title={t('ปิด (Delete)', 'Close (Delete)')}
                onClick={(event) => {
                  event.stopPropagation()
                  onClose(doc.id)
                }}
              >
                ×
              </span>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="doc-tab-add"
        aria-label={t('เอกสารใหม่', 'New document')}
        title={t('เอกสารใหม่', 'New document')}
        onClick={onOpen}
      >
        +
      </button>
    </div>
  )
}
