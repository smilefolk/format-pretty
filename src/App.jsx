import { useEffect, useState } from 'react'
import Compare from './pages/Compare'
import Formatter from './pages/Formatter'
import Unwrap from './pages/Unwrap'
import AppShell from './components/shell/AppShell'
import { LangContext, readLang, writeLang } from './lib/i18n'

export default function App() {
  const [page, setPage] = useState('format')
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('fp-theme') || 'dark')
  const [lang, setLang] = useState(readLang)

  // สถานะของแต่ละหน้าอยู่ตรงนี้ เพื่อไม่ให้ข้อความหายเวลาสลับเมนู
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState('2')
  const [sortKeys, setSortKeys] = useState(false)
  const [view, setView] = useState('code')
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [rawString, setRawString] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('fp-theme', theme)
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

  const notify = (message) => setToast(message)

  const sendToFormatter = (text) => {
    setInput(text)
    setPage('format')
    notify('ส่งผลลัพธ์ไปหน้าจัดรูปแบบแล้ว')
  }

  // ⌘K ยังเป็น stub จนกว่า CommandPalette (#35) จะเสร็จ
  const openPalette = () =>
    notify(lang === 'en' ? 'Command palette is coming soon' : 'ค้นหาคำสั่ง (⌘K) กำลังจะมา')

  return (
    <LangContext.Provider value={lang}>
      <AppShell
        tool={page}
        onSelectTool={setPage}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onLangChange={setLang}
        onCommandPalette={openPalette}
      >
        {page === 'format' && (
          <Formatter
            input={input}
            setInput={setInput}
            indent={indent}
            setIndent={setIndent}
            sortKeys={sortKeys}
            setSortKeys={setSortKeys}
            view={view}
            setView={setView}
            notify={notify}
          />
        )}

        {page === 'compare' && (
          <Compare left={left} setLeft={setLeft} right={right} setRight={setRight} notify={notify} />
        )}

        {page === 'unwrap' && (
          <Unwrap
            input={rawString}
            setInput={setRawString}
            indent={indent}
            setIndent={setIndent}
            view={view}
            setView={setView}
            notify={notify}
            sendToFormatter={sendToFormatter}
          />
        )}

        {toast && <div className="toast">{toast}</div>}
      </AppShell>
    </LangContext.Provider>
  )
}
