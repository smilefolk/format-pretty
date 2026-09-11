import { useEffect, useState } from 'react'
import Compare from './pages/Compare'
import Formatter from './pages/Formatter'
import Unwrap from './pages/Unwrap'
import { L, LangContext, LangSwitch, readLang, writeLang } from './lib/i18n'

const MENU = [
  { value: 'format', th: 'จัดรูปแบบ JSON', en: 'Format JSON' },
  { value: 'compare', th: 'เปรียบเทียบ 2 ก้อน', en: 'Compare' },
  { value: 'unwrap', th: 'สตริง → JSON', en: 'String → JSON' },
]

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

  return (
    <LangContext.Provider value={lang}>
      <div className="app">
        <header className="header">
          <div className="brand">
            <span className="brand-mark">{'{ }'}</span>
            <div>
              <h1>
                Format<span>Pritty</span>
              </h1>
              <p>จัดรูปแบบ ตรวจสอบ และเปรียบเทียบ JSON ในเบราว์เซอร์ — ข้อมูลไม่ถูกส่งออกไปไหน</p>
            </div>
          </div>

          <nav className="menu">
            {MENU.map((m) => (
              <button
                key={m.value}
                className={page === m.value ? 'active' : ''}
                onClick={() => setPage(m.value)}
              >
                <L th={m.th} en={m.en} />
              </button>
            ))}
          </nav>

          <div className="header-tools">
            <LangSwitch onChange={setLang} />
            <button
              className="btn ghost icon"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={lang === 'en' ? 'Toggle theme' : 'สลับธีม'}
            >
              {theme === 'dark' ? '☀︎' : '☾'}
            </button>
          </div>
        </header>

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
      </div>
    </LangContext.Provider>
  )
}
