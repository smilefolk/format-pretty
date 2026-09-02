import { useMemo, useState } from 'react'
import Editor from '../components/Editor'
import { diffJson, preview, summarize, toReport, typeLabel } from '../lib/diff'
import { parseJson } from '../lib/json'

const SAMPLE_LEFT = `{
  "id": 1024,
  "name": "Somchai",
  "active": true,
  "score": 87,
  "roles": ["admin", "editor"],
  "profile": { "city": "Bangkok", "zip": "10110" },
  "legacyField": "ยังอยู่ในก้อนซ้าย"
}`

const SAMPLE_RIGHT = `{
  "id": "1024",
  "name": "Somchai",
  "active": false,
  "score": 87,
  "roles": ["admin", "viewer", "billing"],
  "profile": { "city": "Chiang Mai", "zip": "10110" },
  "newField": "เพิ่มเข้ามาในก้อนขวา"
}`

const FILTERS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'changed', label: 'ค่าต่างกัน' },
  { value: 'type', label: 'ชนิดต่างกัน' },
  { value: 'removed', label: 'เฉพาะซ้าย' },
  { value: 'added', label: 'เฉพาะขวา' },
]

export default function Compare({ left, setLeft, right, setRight, notify }) {
  const [filter, setFilter] = useState('all')

  const leftResult = useMemo(() => parseJson(left), [left])
  const rightResult = useMemo(() => parseJson(right), [right])

  // วางสองก้อนในช่องซ้ายช่องเดียวก็เทียบได้ — แยกให้อัตโนมัติ
  const autoSplit =
    !right.trim() && leftResult.ok && leftResult.merged === 2 && Array.isArray(leftResult.value)

  const pair = autoSplit
    ? { a: leftResult.value[0], b: leftResult.value[1], ready: true }
    : {
        a: leftResult.value,
        b: rightResult.value,
        ready: leftResult.ok && rightResult.ok,
      }

  const diffs = useMemo(
    () => (pair.ready ? diffJson(pair.a, pair.b) : []),
    [pair.ready, pair.a, pair.b]
  )

  const counts = useMemo(() => summarize(diffs), [diffs])
  const shown = filter === 'all' ? diffs : diffs.filter((d) => d.type === filter)

  const handleSwap = () => {
    setLeft(right)
    setRight(left)
  }

  const handleCopyReport = async () => {
    if (!pair.ready) return notify('ต้องมี JSON ที่ถูกต้องทั้งสองฝั่งก่อน')
    try {
      await navigator.clipboard.writeText(toReport(diffs))
      notify('คัดลอกรายงานแล้ว')
    } catch {
      notify('คัดลอกไม่สำเร็จ')
    }
  }

  const copyPath = async (path) => {
    try {
      await navigator.clipboard.writeText(path)
      notify(`คัดลอก ${path} แล้ว`)
    } catch {
      notify('คัดลอกไม่สำเร็จ')
    }
  }

  const sideHead = (label, result) => (
    <div className="pane-head">
      <h2>{label}</h2>
      {result.empty ? (
        <span className="badge">ว่าง</span>
      ) : result.ok ? (
        <span className="badge ok">ถูกต้อง</span>
      ) : (
        <span className="badge bad" title={result.error.message}>
          ผิดพลาด · บรรทัด {result.error.line ?? '?'}
        </span>
      )}
    </div>
  )

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={filter === f.value ? 'active' : ''}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value !== 'all' && counts[f.value] > 0 && ` (${counts[f.value]})`}
            </button>
          ))}
        </div>

        <div className="spacer" />

        <button className="btn" onClick={handleSwap}>
          สลับซ้าย–ขวา
        </button>
        <button className="btn" onClick={handleCopyReport}>
          คัดลอกรายงาน
        </button>
        <button
          className="btn"
          onClick={() => {
            setLeft(SAMPLE_LEFT)
            setRight(SAMPLE_RIGHT)
          }}
        >
          ตัวอย่าง
        </button>
        <button
          className="btn"
          onClick={() => {
            setLeft('')
            setRight('')
          }}
        >
          ล้าง
        </button>
      </div>

      <div className="compare">
        <div className="panes inputs">
          <section className="pane">
            {sideHead('ก้อนซ้าย', leftResult)}
            <Editor
              value={left}
              onChange={setLeft}
              errorLine={leftResult.error?.line}
              placeholder={'วาง JSON ก้อนแรกที่นี่\nหรือวางสองก้อนต่อกันในช่องนี้ช่องเดียว แล้วเว้นช่องขวาไว้'}
            />
          </section>
          <section className="pane">
            {sideHead('ก้อนขวา', rightResult)}
            <Editor
              value={right}
              onChange={setRight}
              errorLine={rightResult.error?.line}
              placeholder="วาง JSON ก้อนที่สองที่นี่"
            />
          </section>
        </div>

        <section className="pane diff-panel">
          <div className="pane-head">
            <h2>จุดที่ต่างกัน</h2>
            <span className="muted">
              {pair.ready ? `แสดง ${shown.length} จาก ${diffs.length} รายการ` : 'ยังเทียบไม่ได้'}
            </span>
          </div>

          <div className="output">
            {!pair.ready && (
              <p className="placeholder">
                {leftResult.empty && rightResult.empty
                  ? 'วาง JSON ทั้งสองก้อนเพื่อเริ่มเปรียบเทียบ'
                  : 'ต้องเป็น JSON ที่ถูกต้องทั้งสองฝั่งก่อนจึงจะเทียบได้'}
              </p>
            )}

            {pair.ready && (
              <div className="result">
                {autoSplit && (
                  <p className="notice">
                    พบ JSON 2 ก้อนในช่องซ้าย — แยกเป็นก้อนซ้าย/ขวาให้อัตโนมัติ
                  </p>
                )}

                {diffs.length === 0 ? (
                  <p className="placeholder same">ข้อมูลสองก้อนเหมือนกันทุกประการ</p>
                ) : shown.length === 0 ? (
                  <p className="placeholder">ไม่มีรายการในตัวกรองนี้</p>
                ) : (
                  <ul className="diff-list">
                    {shown.map((d) => (
                      <li
                        key={d.path + d.type}
                        className={`diff-row ${d.type}`}
                        onClick={() => copyPath(d.path)}
                        title="คลิกเพื่อคัดลอกเส้นทาง"
                      >
                        <div className="diff-head">
                          <span className={`chip ${d.type}`}>{typeLabel(d.type)}</span>
                          <code className="diff-path">{d.path}</code>
                          {d.kinds && (
                            <span className="muted">
                              {d.kinds[0]} → {d.kinds[1]}
                            </span>
                          )}
                        </div>
                        <div className="diff-values">
                          {d.type !== 'added' && (
                            <div className="side left">
                              <span>ซ้าย</span>
                              <code>{preview(d.left)}</code>
                            </div>
                          )}
                          {d.type !== 'removed' && (
                            <div className="side right">
                              <span>ขวา</span>
                              <code>{preview(d.right)}</code>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="statusbar">
        {pair.ready ? (
          <>
            <span className={`badge ${diffs.length === 0 ? 'ok' : 'bad'}`}>
              {diffs.length === 0 ? 'เหมือนกัน' : `ต่างกัน ${diffs.length} จุด`}
            </span>
            <span>ค่าต่างกัน {counts.changed}</span>
            <span>ชนิดต่างกัน {counts.type}</span>
            <span>เฉพาะซ้าย {counts.removed}</span>
            <span>เฉพาะขวา {counts.added}</span>
            <span className="muted">รายการในอาร์เรย์เทียบตามลำดับ (index)</span>
          </>
        ) : (
          <span className="badge">รอข้อมูล</span>
        )}
      </footer>
    </>
  )
}
