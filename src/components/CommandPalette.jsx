import { useEffect, useMemo, useRef, useState } from 'react'
import { GROUPS, listCommands, rankCommands, readRecent, recordRecent } from '../lib/commands'
import { useLang, useT } from '../lib/i18n'
import { KeyCap } from './ui'

// ⌘K — modal ค้นหาคำสั่งจาก registry (lib/commands.js) ใช้ได้ด้วยคีย์บอร์ดล้วน
// - ไม่มีคำค้น: กลุ่ม "ล่าสุด" (MRU จาก localStorage) แล้วตาม GROUPS · มีคำค้น: คำสั่งที่ตรงต้นคำอยู่ในกลุ่มเดิมของมัน
//   ส่วนที่เจอกลางคำอยู่ในกลุ่ม "คำสั่งที่ใกล้เคียง" (rankCommands ใน lib/commands.js)
// - focus อยู่ที่ช่องค้นหาตลอด (Tab ถูกกัน) — App คืน focus ให้ element เดิมตอนปิด
export default function CommandPalette({ open, onClose, ctx }) {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [recent, setRecent] = useState(readRecent)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // รายการที่มองเห็น + ลำดับแบน (สำหรับ ↑↓) — คิดใหม่ทุก render เพราะ state ของ doc เปลี่ยนได้
  const commands = useMemo(() => (open ? listCommands(ctx) : []), [open, ctx])
  const needle = query.trim()
  const sections = useMemo(() => {
    const byGroup = (list) =>
      GROUPS.map((g) => ({ ...g, items: list.filter((c) => c.group === g.id) })).filter(
        (g) => g.items.length
      )
    if (needle) {
      const { primary, related } = rankCommands(commands, needle, { lang, recent })
      const groups = byGroup(primary)
      if (related.length)
        groups.push({ id: 'related', th: 'คำสั่งที่ใกล้เคียง', en: 'Related', items: related })
      return groups
    }
    const recentItems = recent.map((id) => commands.find((c) => c.id === id)).filter(Boolean)
    const groups = byGroup(commands)
    if (recentItems.length)
      groups.unshift({ id: 'recent', th: 'ล่าสุด', en: 'Recent', items: recentItems })
    return groups
  }, [commands, needle, lang, recent])
  // แถวแบนสำหรับ ↑↓ — คำสั่งเดียวกันโผล่ได้สองที่ (กลุ่มล่าสุด + กลุ่มเดิม) จึงระบุตัวด้วย section:id ไม่ใช่ cmd
  const flat = useMemo(
    () => sections.flatMap((s) => s.items.map((cmd) => ({ key: `${s.id}:${cmd.id}`, cmd }))),
    [sections]
  )

  // เปิดใหม่ทุกครั้ง: ล้างคำค้น เลือกแถวแรก focus ช่องค้นหา
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    inputRef.current?.focus()
  }, [open])

  useEffect(() => setSelected(0), [needle])

  // แถวที่เลือกต้องอยู่ในสายตาเสมอ
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, selected, flat])

  if (!open) return null

  const currentRow = flat[Math.min(selected, flat.length - 1)]
  const current = currentRow?.cmd

  const runCommand = (cmd) => {
    onClose()
    setRecent(recordRecent(cmd.id, recent))
    cmd.run(ctx)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!flat.length) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setSelected((i) => (i + step + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (current) runCommand(current)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      // focus trap: ใน dialog มีช่องค้นหาช่องเดียวที่รับ focus
      e.preventDefault()
    }
  }

  const label = (cmd) => (lang === 'en' ? cmd.en : cmd.th)
  const hint = (cmd) => (lang === 'en' ? cmd.th : cmd.en)
  const groupLabel = (g) => (lang === 'en' ? g.en : `${g.th} · ${g.en.toUpperCase()}`)
  const optionId = (row) => `cmd-${row.key.replace(':', '-')}`

  return (
    <div className="palette-scrim" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('ค้นหาคำสั่ง', 'Command palette')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette-query">
          <span className="palette-prompt" aria-hidden="true">
            ›
          </span>
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('พิมพ์คำสั่ง…', 'Type a command…')}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
            aria-activedescendant={currentRow ? optionId(currentRow) : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <KeyCap>ESC</KeyCap>
        </div>

        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {sections.length === 0 && (
            <p className="palette-empty">
              {t(`ไม่พบคำสั่งที่ตรงกับ "${needle}"`, `No commands match "${needle}"`)}
            </p>
          )}
          {sections.map((section) => (
            <div key={section.id} role="group" aria-label={groupLabel(section)}>
              <div className="palette-group">{groupLabel(section)}</div>
              {section.items.map((cmd) => {
                const row = { key: `${section.id}:${cmd.id}`, cmd }
                const isSelected = row.key === currentRow?.key
                const state = cmd.state?.(ctx)
                return (
                  <div
                    key={cmd.id}
                    id={optionId(row)}
                    className={isSelected ? 'palette-row selected' : 'palette-row'}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelected(flat.findIndex((r) => r.key === row.key))}
                    onClick={() => runCommand(cmd)}
                  >
                    <span className="palette-glyph" aria-hidden="true">
                      {cmd.glyph}
                    </span>
                    <span className="palette-name">{label(cmd)}</span>
                    <span className="palette-hint">
                      {cmd.hint ? (lang === 'en' ? cmd.hint.th : cmd.hint.en) : hint(cmd)}
                    </span>
                    {state ? (
                      <span className="palette-pill">{t('เปิดอยู่', 'On')}</span>
                    ) : cmd.keys ? (
                      <KeyCap>{cmd.keys}</KeyCap>
                    ) : isSelected ? (
                      <KeyCap>↵</KeyCap>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="palette-footer">
          <span>↑↓ {t('เลื่อน', 'move')}</span>
          <span>↵ {t('เลือก', 'select')}</span>
          <span>⌘K {t('ปิด', 'close')}</span>
          <span className="palette-count">
            {needle ? flat.length : commands.length} {t('คำสั่ง', 'commands')}
          </span>
        </div>
      </div>
    </div>
  )
}
