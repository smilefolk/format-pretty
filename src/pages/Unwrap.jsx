import { Fragment, useMemo, useRef, useState } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import JsonTree from '../components/JsonTree'
import { KeyCap, PaneHead } from '../components/ui'
import { L, useLang, useT } from '../lib/i18n'
import { formatBytes, getStats, stringify } from '../lib/json'
import { unwrapJson, unwrapNested } from '../lib/unwrap'

// ปุ่ม "ตัวอย่าง" สลับสองชุดนี้ (และ palette #34 ใช้ต่อ)
export const SAMPLE = `"{\\"order_id\\":\\"A-1024\\",\\"items\\":[{\\"sku\\":\\"X1\\",\\"qty\\":2},{\\"sku\\":\\"Y7\\",\\"qty\\":1}],\\"paid\\":true,\\"note\\":null}"`

// ตัวอย่างซ้อน: สตริงชั้นนอก → ฟิลด์ payload → ฟิลด์ customer (chain 3 ชั้นตรง mock 3b)
export const SAMPLE_NESTED = `"{\\"event\\":\\"order.created\\",\\"ts\\":\\"2026-09-02T10:20:30Z\\",\\"payload\\":\\"{\\\\\\"order_id\\\\\\":\\\\\\"A-1024\\\\\\",\\\\\\"customer\\\\\\":\\\\\\"{\\\\\\\\\\\\\\"id\\\\\\\\\\\\\\":7,\\\\\\\\\\\\\\"tier\\\\\\\\\\\\\\":\\\\\\\\\\\\\\"gold\\\\\\\\\\\\\\"}\\\\\\"}\\"}"`

// ชื่อฟิลด์ท้ายสุดของ path สำหรับ chip ใน chain (path เต็มอยู่ใน title) — จุดในเครื่องหมายคำพูดไม่นับ
function lastSegment(path) {
  let depth = 0
  for (let i = path.length - 1; i >= 0; i--) {
    const ch = path[i]
    if (ch === ']') depth++
    else if (ch === '[') depth--
    else if (ch === '.' && depth === 0) return path.slice(i + 1)
  }
  return path
}

export default function Unwrap({ input, setInput, indent, setIndent, view, setView, notify, sendToFormatter }) {
  const t = useT()
  const lang = useLang()
  const editorRef = useRef(null)
  const [deep, setDeep] = useState(true)

  const result = useMemo(() => unwrapJson(input), [input])

  const nested = useMemo(
    () =>
      result.ok && deep
        ? unwrapNested(result.value)
        : { value: result.value, count: 0, fields: [], passes: 1 },
    [result, deep]
  )

  // chain ชั้นที่แกะ: ชั้นนอก (string) ต่อด้วยฟิลด์ที่แกะได้ เรียงเลขต่อกัน
  const chain = [
    ...result.peels.map((p) => ({ n: p.n, where: p.where, title: t('ชั้นนอกของสตริง', 'Outer string layer') })),
    ...nested.fields.map((f, i) => ({ n: result.layers + i + 1, where: lastSegment(f.path), title: f.path })),
  ]

  const output = useMemo(
    () => (result.ok ? stringify(nested.value, indent) : ''),
    [result.ok, nested.value, indent]
  )

  const stats = useMemo(() => (result.ok ? getStats(nested.value, output) : null), [result.ok, nested.value, output])

  const handleCopy = async () => {
    if (!output) return notify('ยังไม่มีผลลัพธ์ให้คัดลอก')
    try {
      await navigator.clipboard.writeText(output)
      notify('คัดลอกไปยังคลิปบอร์ดแล้ว')
    } catch {
      notify('คัดลอกไม่สำเร็จ')
    }
  }

  const handleDownload = () => {
    if (!output) return notify('ยังไม่มีผลลัพธ์ให้ดาวน์โหลด')
    const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'unwrapped.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // D5(a): แกะแล้วเขียนผลทับช่องซ้าย (เหมือน "จัดรูปแบบ" ของ Formatter)
  const handleUnwrap = () => {
    if (!result.ok) return notify(result.empty ? 'ยังไม่มีข้อมูลให้แกะ' : 'แกะเป็น JSON ไม่ได้')
    if (chain.length === 0) return notify('ข้อมูลนี้เป็น JSON อยู่แล้ว ไม่ต้องแกะ')
    setInput(output)
    notify(`แกะสตริง ${chain.length} ชั้นเรียบร้อย`)
  }

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleUnwrap()
    }
  }

  const readFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(String(reader.result))
      notify(`โหลดไฟล์ ${file.name} แล้ว`)
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="workbench">
        <section className="pane source">
          <PaneHead th="สตริง JSON" en="Escaped string">
            <span className="pane-meta">
              {input.split('\n').length} {t('บรรทัด', 'lines')} · {formatBytes(new Blob([input]).size)}
            </span>
          </PaneHead>
          <Editor
            ref={editorRef}
            wrap
            value={input}
            onChange={setInput}
            errorLine={result.error?.line}
            onDropFile={readFile}
            onKeyDown={onKeyDown}
            placeholder={
              'วางสตริง JSON ที่นี่ เช่น "{\\"a\\":1}"\n' +
              'วางแบบไม่มีเครื่องหมายคำพูดครอบ เช่น {\\"a\\":1} ก็ได้ และรองรับการ escape ซ้อนหลายชั้น'
            }
          />
          {chain.length > 0 && (
            <div className="peel-card">
              <div className="peel-label">
                {lang === 'en' ? 'PEELED LAYERS' : 'ชั้นที่แกะได้ · PEELED LAYERS'}
              </div>
              <div className="peel-chain">
                {chain.map((c, i) => (
                  <Fragment key={c.n}>
                    {i > 0 && (
                      <span className="peel-arrow" aria-hidden="true">
                        →
                      </span>
                    )}
                    <span
                      className={i === chain.length - 1 ? 'peel-chip last' : 'peel-chip'}
                      title={c.title}
                    >
                      {c.n} · {c.where}
                    </span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
          <div className="action-bar">
            <button className="btn primary" onClick={handleUnwrap}>
              {t('แกะสตริง', 'Unwrap')}
              <KeyCap variant="primary">⌘↵</KeyCap>
            </button>
            <div className="spacer" />
            <button
              className="btn ghost"
              onClick={() => setInput(input === SAMPLE ? SAMPLE_NESTED : SAMPLE)}
              title={t('สลับตัวอย่างธรรมดา / ซ้อนในฟิลด์', 'Toggle simple / nested sample')}
            >
              {t('ตัวอย่าง', 'Sample')}
            </button>
            <button className="btn ghost" onClick={() => setInput('')}>
              {t('ล้าง', 'Clear')}
            </button>
          </div>
        </section>

        <section className="pane">
          <div className="pane-head">
            <h2>
              <L th="ผลลัพธ์ JSON" en="Result" />
            </h2>
            <div className="tabs">
              <button className={view === 'code' ? 'active' : ''} onClick={() => setView('code')}>
                โค้ด
              </button>
              <button className={view === 'tree' ? 'active' : ''} onClick={() => setView('tree')}>
                โครงสร้าง
              </button>
            </div>
            <div className="pane-actions">
              <button className="btn small" onClick={handleCopy}>
                คัดลอก
              </button>
              <button className="btn small" onClick={handleDownload}>
                ดาวน์โหลด
              </button>
            </div>
          </div>

          <div className="output">
            {result.empty && <p className="placeholder">ยังไม่มีข้อมูล — วางสตริง JSON ที่ช่องด้านซ้าย</p>}

            {result.error && (
              <div className="error">
                <strong>{result.layers > 0 ? 'แกะสตริงแล้ว แต่ข้างในไม่ใช่ JSON' : 'แกะเป็น JSON ไม่ได้'}</strong>
                <p>{result.error.message}</p>
                {result.error.line && (
                  <p className="muted">
                    บรรทัด {result.error.line} คอลัมน์ {result.error.column} (ของข้อความหลังแกะ {result.layers} ชั้น)
                  </p>
                )}
                {result.layers > 0 && (
                  <>
                    <p className="muted">ข้อความที่แกะได้:</p>
                    <pre className="peeled">{result.peeled}</pre>
                  </>
                )}
              </div>
            )}

            {result.ok && (
              <div className="result">
                {(result.layers > 0 || nested.count > 0 || result.merged > 1) && (
                  <p className="notice">
                    {result.layers > 0 && `แกะสตริง ${result.layers} ชั้น`}
                    {result.layers > 0 && (nested.count > 0 || result.merged > 1) && ' · '}
                    {nested.count > 0 && `แกะสตริงในฟิลด์อีก ${nested.count} จุด`}
                    {nested.count > 0 && result.merged > 1 && ' · '}
                    {result.merged > 1 && `รวม JSON ${result.merged} ก้อนเป็นอาร์เรย์`}
                  </p>
                )}
                {result.layers === 0 && nested.count === 0 && result.merged <= 1 && (
                  <p className="notice">ข้อมูลนี้เป็น JSON อยู่แล้ว ไม่ต้องแกะ</p>
                )}
                {view === 'code' ? <CodeView code={output} /> : <JsonTree data={nested.value} />}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="statusbar">
        {result.ok ? (
          <>
            <span className="badge ok">แกะสำเร็จ</span>
            <span>แกะ {result.layers} ชั้น</span>
            {nested.count > 0 && <span>ฟิลด์ที่แกะ {nested.count} จุด</span>}
            <span>{stats.lines} บรรทัด</span>
            <span>{formatBytes(stats.bytes)}</span>
            <span>{stats.keys} คีย์</span>
            <span>ความลึก {stats.depth}</span>
          </>
        ) : (
          <span className={`badge ${result.empty ? '' : 'bad'}`}>{result.empty ? 'ว่าง' : 'แกะไม่สำเร็จ'}</span>
        )}
      </footer>
    </>
  )
}
