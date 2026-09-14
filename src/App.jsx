import { useCallback, useEffect, useRef, useState } from 'react'
import Compare from './pages/Compare'
import Formatter from './pages/Formatter'
import Unwrap from './pages/Unwrap'
import CommandPalette from './components/CommandPalette'
import AppShell from './components/shell/AppShell'
import DocTabs from './components/shell/DocTabs'
import { ActionsContext } from './hooks/useActions'
import useDocs from './hooks/useDocs'
import { LangContext, readLang, writeLang } from './lib/i18n'

// อ่านธีมแบบไม่พัง — SSR / private mode อาจไม่มี localStorage
function readTheme() {
  try {
    return localStorage.getItem('fp-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export default function App() {
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(readTheme)
  const [lang, setLang] = useState(readLang)
  const notify = (message) => setToast(message)

  // เนื้อหาและตัวเลือกของทุกหน้าอยู่ใน doc (lib/docs.js) — เครื่องมือที่แสดงคือ tool ของ doc ที่ active
  const { docs, activeId, doc, open, close, rename, update, activate, openTool } = useDocs({
    notify,
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('fp-theme', theme)
    } catch {
      /* เก็บไม่ได้ก็ใช้ค่าในหน่วยความจำ */
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    writeLang(lang)
  }, [lang])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(id)
  }, [toast])

  // setter ต่อฟิลด์ของ doc ที่ active — หน้าเดิมรับ props รูปแบบ value/setValue อยู่แล้ว ไม่ต้องแก้หน้า
  const field = (key) => (value) => update(doc.id, { [key]: value })

  // registry ของ action ที่หน้า active ลงทะเบียน (hooks/useActions.js) — palette เรียกตัวเดียวกับปุ่มในหน้า
  const actionsRef = useRef({})
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  // ctx ของ command registry (lib/commands.js) — `actions` อ่านสด ๆ จาก ref เพราะหน้าลงทะเบียนหลัง App render
  const commandCtx = {
    doc,
    docs,
    get actions() {
      return actionsRef.current
    },
    set: (key, value) => update(doc.id, { [key]: value }),
    openTool,
    newDoc: () => open(doc.tool),
    closeDoc: () => close(doc.id),
    activateDoc: activate,
    theme,
    toggleTheme,
    lang,
    setLang,
  }

  const sendToFormatter = (text) => {
    open('format', { name: 'จาก unwrap', input: text })
    notify('ส่งผลลัพธ์ไปหน้าจัดรูปแบบแล้ว')
  }

  // ⌘K — จำ element ที่ focus อยู่ก่อนเปิด แล้วคืนให้ตอนปิด (caret ใน textarea ไม่ขยับ)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const returnFocusRef = useRef(null)
  const openPalette = useCallback(() => {
    returnFocusRef.current = document.activeElement
    setPaletteOpen(true)
  }, [])
  const closePalette = useCallback(() => {
    setPaletteOpen(false)
    const el = returnFocusRef.current
    returnFocusRef.current = null
    if (el && typeof el.focus === 'function' && document.contains(el)) el.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (paletteOpen) closePalette()
        else openPalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paletteOpen, openPalette, closePalette])

  return (
    <LangContext.Provider value={lang}>
      <ActionsContext.Provider value={actionsRef}>
        <AppShell
          tool={doc.tool}
          onSelectTool={openTool}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLangChange={setLang}
          onCommandPalette={openPalette}
          tabs={
            <DocTabs
              docs={docs}
              activeId={activeId}
              onActivate={activate}
              onClose={close}
              onOpen={() => open(doc.tool)}
              onRename={rename}
            />
          }
        >
          {/* key = doc.id ให้แต่ละเอกสารได้ instance ของหน้าใหม่ (state เฉพาะ UI ไม่ปนกัน) */}
          {doc.tool === 'format' && (
            <Formatter
              key={doc.id}
              input={doc.input}
              setInput={field('input')}
              indent={doc.indent}
              setIndent={field('indent')}
              sortKeys={doc.sortKeys}
              setSortKeys={field('sortKeys')}
              mergeChunks={doc.mergeChunks}
              setMergeChunks={field('mergeChunks')}
              view={doc.view}
              setView={field('view')}
              notify={notify}
            />
          )}

          {doc.tool === 'compare' && (
            <Compare
              key={doc.id}
              left={doc.left}
              setLeft={field('left')}
              right={doc.right}
              setRight={field('right')}
              strategy={doc.strategy}
              setStrategy={field('strategy')}
              arrayKey={doc.arrayKey}
              setArrayKey={field('arrayKey')}
              showEqual={doc.showEqual}
              setShowEqual={field('showEqual')}
              notify={notify}
            />
          )}

          {doc.tool === 'unwrap' && (
            <Unwrap
              key={doc.id}
              input={doc.input}
              setInput={field('input')}
              indent={doc.indent}
              setIndent={field('indent')}
              view={doc.view}
              setView={field('view')}
              deep={doc.deep}
              setDeep={field('deep')}
              repeat={doc.repeat}
              setRepeat={field('repeat')}
              notify={notify}
              sendToFormatter={sendToFormatter}
            />
          )}

          {/* live region อยู่ตลอด (ว่างเมื่อไม่มี toast) ให้ screen reader ประกาศข้อความใหม่ได้ */}
          <div className="toast-region" role="status" aria-live="polite">
            {toast && <div className="toast">{toast}</div>}
          </div>
          <CommandPalette open={paletteOpen} onClose={closePalette} ctx={commandCtx} />
        </AppShell>
      </ActionsContext.Provider>
    </LangContext.Provider>
  )
}
