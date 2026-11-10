import { createContext, useContext } from 'react'
import { langFromSearch, searchForLang } from './seo'

// ระบบ label สองภาษา — ไทยเป็นหลัก อังกฤษเป็น sub-label ตัวเล็ก (โหมด th)
// หรืออังกฤษล้วนในช่องหลัก (โหมด en) — App ถือ state `lang` แล้วส่งลงมาทาง Provider

export const LANGS = ['th', 'en']
const STORAGE_KEY = 'fp-lang'

export const LangContext = createContext('th')

export const useLang = () => useContext(LangContext)

// คืนฟังก์ชัน t(th, en) สำหรับจุดที่ต้องการสตริงล้วน เช่น title, aria-label, placeholder, toast
export function useT() {
  const lang = useLang()
  return (th, en) => (lang === 'en' && en ? en : th)
}

// ภาษาเริ่มต้น: `?lang=` ใน URL มาก่อน (ลิงก์ /?lang=en ที่ Google index แยกต้องเปิดเป็นอังกฤษเสมอ
// ไม่ว่าเครื่องนั้นเคยเลือกอะไรไว้) แล้วค่อย localStorage — ใน SSR ไม่มี location, private mode อาจ throw
export function readLang() {
  const fromUrl = typeof location === 'undefined' ? null : langFromSearch(location.search)
  if (fromUrl) return fromUrl
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return LANGS.includes(value) ? value : 'th'
  } catch {
    return 'th'
  }
}

export function writeLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* เก็บไม่ได้ก็ใช้ค่าในหน่วยความจำไปจนกว่าจะ refresh */
  }
  // URL ตามภาษาที่เลือก (อังกฤษ = ?lang=en, ไทย = URL หลัก) — คัดลอกลิงก์ไปให้คนอื่นแล้วได้ภาษาเดียวกัน
  // replaceState ไม่เพิ่ม history และไม่โหลดหน้าใหม่
  const search = searchForLang(location.search, lang)
  if (search !== location.search) {
    history.replaceState(history.state, '', `${location.pathname}${search}${location.hash}`)
  }
}

const cx = (...names) => names.filter(Boolean).join(' ')

/**
 * <L th="ต้นฉบับ" en="Source" />
 * - โหมด th: ไทย + sub-label อังกฤษตัวพิมพ์ใหญ่ mono (9.5px .08em) — `panel` ใช้ขนาดของ options panel (9px .06em)
 * - โหมด en: อังกฤษล้วน ซ่อน sub-label; ถ้าไม่มี `en` ให้แสดงไทยแทน
 * - `stack` วาง sub-label ไว้ใต้ไทย (label ของ Toggle) แทนที่จะวางต่อท้าย
 */
export function L({ th, en, panel = false, stack = false, className }) {
  const lang = useLang()
  if (lang === 'en') {
    return <span className={cx('l', className)}>{en || th}</span>
  }
  return (
    <span className={cx('l', stack && 'stack', className)}>
      <span className="l-th">{th}</span>
      {en && <span className={cx('l-en', panel && 'panel')}>{en}</span>}
    </span>
  )
}

// สวิตช์ TH / EN (spec: top bar) — radiogroup ให้คีย์บอร์ดเลือกได้และอ่านสถานะออก
export function LangSwitch({ onChange }) {
  const lang = useLang()
  const t = useT()
  return (
    <div
      className="lang-switch"
      role="radiogroup"
      aria-label={t('ภาษาของป้ายกำกับ', 'Label language')}
    >
      {LANGS.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={lang === value}
          className={lang === value ? 'active' : ''}
          onClick={() => onChange(value)}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
