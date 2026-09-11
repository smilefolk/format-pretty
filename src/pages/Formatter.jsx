import { useCallback, useMemo, useRef } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import JsonTree from '../components/JsonTree'
import { L } from '../lib/i18n'
import { formatBytes, getStats, parseJson, sortKeysDeep, stringify } from '../lib/json'

const SAMPLE = `{"name":"FormatPritty","version":"1.0.0","tags":["json","formatter","react"],"config":{"indent":2,"sortKeys":false,"theme":"dark"},"stats":{"users":1284,"rating":4.8,"active":true,"deprecated":null},"authors":[{"name":"Somchai","role":"dev"},{"name":"Malee","role":"design"}]}`

const SAMPLE_MULTI = `{"id":1,"user":"somchai","action":"login"}
{"id":2,"user":"malee","action":"upload","size":4821}
{"id":3,"user":"somchai","action":"logout"}`

const INDENTS = [
  { value: '2', label: '2 ช่อง' },
  { value: '4', label: '4 ช่อง' },
  { value: 'tab', label: 'แท็บ' },
]

export default function Formatter({ input, setInput, indent, setIndent, sortKeys, setSortKeys, view, setView, notify }) {
  const fileRef = useRef(null)

  const result = useMemo(() => parseJson(input), [input])

  const value = useMemo(
    () => (result.ok && sortKeys ? sortKeysDeep(result.value) : result.value),
    [result, sortKeys]
  )

  const output = useMemo(() => (result.ok ? stringify(value, indent) : ''), [result.ok, value, indent])
  const stats = useMemo(() => (result.ok ? getStats(value, output) : null), [result.ok, value, output])

  const handleFormat = useCallback(() => {
    if (!result.ok) return notify('JSON ไม่ถูกต้อง จัดรูปแบบไม่ได้')
    setInput(output)
    notify('จัดรูปแบบเรียบร้อย')
  }, [result.ok, output, setInput, notify])

  const handleMinify = () => {
    if (!result.ok) return notify('JSON ไม่ถูกต้อง ย่อขนาดไม่ได้')
    setInput(JSON.stringify(value))
    notify('ย่อขนาดเรียบร้อย')
  }

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
    a.download = 'formatted.json'
    a.click()
    URL.revokeObjectURL(url)
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

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleFormat()
    }
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn primary" onClick={handleFormat}>
          จัดรูปแบบ <kbd>⌘↵</kbd>
        </button>
        <button className="btn" onClick={handleMinify}>
          ย่อขนาด
        </button>

        <label className="field">
          ระยะเยื้อง
          <select value={indent} onChange={(e) => setIndent(e.target.value)}>
            {INDENTS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </label>

        <label className="check">
          <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} />
          เรียงคีย์ A→Z
        </label>

        <div className="spacer" />

        <button className="btn" onClick={() => fileRef.current?.click()}>
          เปิดไฟล์
        </button>
        <button className="btn" onClick={() => setInput(SAMPLE)}>
          ตัวอย่าง
        </button>
        <button className="btn" onClick={() => setInput(SAMPLE_MULTI)}>
          ตัวอย่างหลายก้อน
        </button>
        <button className="btn" onClick={() => setInput('')}>
          ล้าง
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json"
          hidden
          onChange={(e) => {
            readFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <main className="panes">
        <section className="pane">
          <div className="pane-head">
            <h2>
              <L th="ต้นฉบับ" en="Source" />
            </h2>
            <span className="muted">
              {input.split('\n').length} บรรทัด · {formatBytes(new Blob([input]).size)}
            </span>
          </div>
          <Editor
            value={input}
            onChange={setInput}
            errorLine={result.error?.line}
            onDropFile={readFile}
            onKeyDown={onKeyDown}
            placeholder={
              'วาง JSON ที่นี่ หรือลากไฟล์มาวาง เช่น {"hello": "world"}\n' +
              'วางหลายก้อนต่อกันได้ (NDJSON หรือคั่นด้วย ,) ระบบจะรวมเป็นอาร์เรย์ให้อัตโนมัติ'
            }
          />
        </section>

        <section className="pane">
          <div className="pane-head">
            <h2>
              <L th="ผลลัพธ์" en="Output" />
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
            {result.empty && <p className="placeholder">ยังไม่มีข้อมูล — วาง JSON ที่ช่องด้านซ้าย</p>}
            {result.error && (
              <div className="error">
                <strong>JSON ไม่ถูกต้อง</strong>
                <p>{result.error.message}</p>
                {result.error.line && (
                  <p className="muted">
                    บรรทัด {result.error.line} คอลัมน์ {result.error.column}
                  </p>
                )}
              </div>
            )}
            {result.ok && (
              <div className="result">
                {result.merged > 1 && (
                  <p className="notice">พบ JSON {result.merged} ก้อนต่อกัน — รวมเป็นอาร์เรย์เดียวให้แล้ว</p>
                )}
                {view === 'code' ? <CodeView code={output} /> : <JsonTree data={value} />}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="statusbar">
        {result.ok ? (
          <>
            <span className="badge ok">ถูกต้อง</span>
            {result.merged > 1 && <span className="badge merged">รวม {result.merged} ก้อน → อาร์เรย์</span>}
            <span>{stats.lines} บรรทัด</span>
            <span>{formatBytes(stats.bytes)}</span>
            <span>{stats.keys} คีย์</span>
            <span>{stats.objects} อ็อบเจ็กต์</span>
            <span>{stats.arrays} อาร์เรย์</span>
            <span>ความลึก {stats.depth}</span>
          </>
        ) : (
          <span className={`badge ${result.empty ? '' : 'bad'}`}>
            {result.empty ? 'ว่าง' : 'ผิดพลาด'}
          </span>
        )}
      </footer>
    </>
  )
}
