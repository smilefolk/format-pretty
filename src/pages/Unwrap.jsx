import { useMemo, useState } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import JsonTree from '../components/JsonTree'
import { L } from '../lib/i18n'
import { INDENT_OPTIONS } from '../lib/constants'
import { formatBytes, getStats, stringify } from '../lib/json'
import { unwrapJson, unwrapNested } from '../lib/unwrap'

const SAMPLE = `"{\\"order_id\\":\\"A-1024\\",\\"items\\":[{\\"sku\\":\\"X1\\",\\"qty\\":2},{\\"sku\\":\\"Y7\\",\\"qty\\":1}],\\"paid\\":true,\\"note\\":null}"`

const SAMPLE_NESTED = `{"event":"order.created","ts":"2026-09-02T10:20:30Z","payload":"{\\"order_id\\":\\"A-1024\\",\\"customer\\":\\"{\\\\\\"id\\\\\\":7,\\\\\\"tier\\\\\\":\\\\\\"gold\\\\\\"}\\"}"}`

export default function Unwrap({ input, setInput, indent, setIndent, view, setView, notify, sendToFormatter }) {
  const [deep, setDeep] = useState(true)

  const result = useMemo(() => unwrapJson(input), [input])

  const nested = useMemo(
    () => (result.ok && deep ? unwrapNested(result.value) : { value: result.value, count: 0 }),
    [result, deep]
  )

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
    <div className="legacy-page">
      <div className="toolbar">
        <label className="check">
          <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
          แกะสตริง JSON ที่ซ้อนอยู่ในฟิลด์ด้วย
        </label>

        <label className="field">
          ระยะเยื้อง
          <select value={indent} onChange={(e) => setIndent(e.target.value)}>
            {INDENT_OPTIONS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.mono ? `${i.th} ช่อง` : i.th}
              </option>
            ))}
          </select>
        </label>

        <div className="spacer" />

        <button
          className="btn"
          onClick={() => (output ? sendToFormatter(output) : notify('ยังไม่มีผลลัพธ์'))}
        >
          ส่งไปหน้าจัดรูปแบบ
        </button>
        <button className="btn" onClick={() => setInput(SAMPLE)}>
          ตัวอย่าง
        </button>
        <button className="btn" onClick={() => setInput(SAMPLE_NESTED)}>
          ตัวอย่างซ้อนในฟิลด์
        </button>
        <button className="btn" onClick={() => setInput('')}>
          ล้าง
        </button>
      </div>

      <main className="panes">
        <section className="pane">
          <div className="pane-head">
            <h2>
              <L th="สตริง JSON" en="JSON string" />
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
            placeholder={
              'วางสตริง JSON ที่นี่ เช่น "{\\"a\\":1}"\n' +
              'วางแบบไม่มีเครื่องหมายคำพูดครอบ เช่น {\\"a\\":1} ก็ได้ และรองรับการ escape ซ้อนหลายชั้น'
            }
          />
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
      </main>

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
    </div>
  )
}
