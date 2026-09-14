import { useEffect, useMemo, useRef, useState } from 'react'
import { tokenize } from '../lib/json'

// เอกสารยาวเกินนี้จะเรนเดอร์เฉพาะบรรทัดที่มองเห็น (virtualized) — ไม่งั้น JSON หลาย MB กลายเป็น <span> นับล้าน
// tokenize ต่อบรรทัดให้ผลเท่ากับทั้งก้อน เพราะสตริง JSON มี \n ข้ามบรรทัดไม่ได้
const VIRTUAL_MIN_LINES = 2000
const OVERSCAN = 20

function Tokens({ text }) {
  return tokenize(text).map((t, i) => (
    <span key={i} className={`tok-${t.type}`}>
      {t.text}
    </span>
  ))
}

function VirtualCodeView({ lines }) {
  const ref = useRef(null)
  const [lineHeight, setLineHeight] = useState(20.4)
  const [range, setRange] = useState({ start: 0, end: 80 })

  // line-height จริงจาก CSS (12px × 1.7) — วัดครั้งเดียวตอน mount
  useEffect(() => {
    const pre = ref.current?.querySelector('.code')
    const lh = pre ? parseFloat(getComputedStyle(pre).lineHeight) : NaN
    if (lh > 0) setLineHeight(lh)
  }, [])

  const update = () => {
    const el = ref.current
    if (!el) return
    const first = Math.floor(el.scrollTop / lineHeight)
    const visible = Math.ceil(el.clientHeight / lineHeight)
    const start = Math.max(0, first - OVERSCAN)
    const end = Math.min(lines.length, first + visible + OVERSCAN)
    setRange((r) => (r.start === start && r.end === end ? r : { start, end }))
  }
  useEffect(update, [lineHeight, lines.length])

  const before = range.start * lineHeight
  const after = Math.max(0, (lines.length - range.end) * lineHeight)
  const slice = lines.slice(range.start, range.end)

  return (
    <div className="code-view virtual" ref={ref} onScroll={update}>
      <div className="gutter" aria-hidden="true">
        <div style={{ height: before }} />
        {slice.map((_, i) => (
          <div key={range.start + i}>{range.start + i + 1}</div>
        ))}
        <div style={{ height: after }} />
      </div>
      <pre className="code">
        <div style={{ height: before }} />
        {slice.map((line, i) => (
          <div key={range.start + i}>
            <Tokens text={line} />
          </div>
        ))}
        <div style={{ height: after }} />
      </pre>
    </div>
  )
}

export default function CodeView({ code }) {
  const lines = useMemo(() => code.split('\n'), [code])
  const virtual = lines.length > VIRTUAL_MIN_LINES
  const tokens = useMemo(() => (virtual ? [] : tokenize(code)), [code, virtual])

  if (virtual) return <VirtualCodeView lines={lines} />

  return (
    <div className="code-view">
      <div className="gutter" aria-hidden="true">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="code">
        {tokens.map((t, i) => (
          <span key={i} className={`tok-${t.type}`}>
            {t.text}
          </span>
        ))}
      </pre>
    </div>
  )
}
