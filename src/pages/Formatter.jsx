import { useCallback, useMemo, useRef } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import JsonTree from '../components/JsonTree'
import { Badge, KeyCap, PaneHead } from '../components/ui'
import { useT } from '../lib/i18n'
import { formatBytes, getStats, parseJson, sortKeysDeep, stringify } from '../lib/json'

const INDENTS = [
  { value: '2', label: '2 ช่อง' },
  { value: '4', label: '4 ช่อง' },
  { value: 'tab', label: 'แท็บ' },
]

export default function Formatter({
  input,
  setInput,
  indent,
  setIndent,
  sortKeys,
  setSortKeys,
  mergeChunks,
  setMergeChunks,
  view,
  setView,
  notify,
}) {
  const t = useT()
  const fileRef = useRef(null)
  const editorRef = useRef(null)

  const result = useMemo(() => parseJson(input, { merge: mergeChunks }), [input, mergeChunks])

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
      <div className="workbench">
        <section className="pane source">
          <PaneHead th="ต้นฉบับ" en="Source">
            <span className="pane-meta">
              {input.split('\n').length} {t('บรรทัด', 'lines')} · {formatBytes(new Blob([input]).size)}
            </span>
          </PaneHead>
          <Editor
            ref={editorRef}
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
          <div className="action-bar">
            <button className="btn primary" onClick={handleFormat}>
              {t('จัดรูปแบบ', 'Format')}
              <KeyCap variant="primary">⌘↵</KeyCap>
            </button>
            <button className="btn secondary" onClick={handleMinify}>
              {t('ย่อขนาด', 'Minify')}
            </button>
            <div className="spacer" />
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>
              {t('เปิดไฟล์', 'Open file')}
            </button>
            <button className="btn ghost" onClick={() => setInput('')}>
              {t('ล้าง', 'Clear')}
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
        </section>

        <section className="pane">
          <PaneHead
            th="ผลลัพธ์"
            en="Output"
            badge={
              result.ok ? (
                <Badge variant="ok">{t('ถูกต้อง', 'Valid')}</Badge>
              ) : result.empty ? (
                <Badge variant="neutral">{t('ว่าง', 'Empty')}</Badge>
              ) : (
                <Badge variant="danger">{t('ผิดพลาด', 'Invalid')}</Badge>
              )
            }
          >
            <button className="btn small" onClick={handleCopy}>
              {t('คัดลอก', 'Copy')}
            </button>
            <button className="btn small" onClick={handleDownload}>
              {t('ดาวน์โหลด', 'Download')}
            </button>
          </PaneHead>

          <div className="output">
            {result.empty && (
              <p className="placeholder">{t('ยังไม่มีข้อมูล — วาง JSON ที่ช่องด้านซ้าย', 'Nothing yet — paste JSON on the left')}</p>
            )}
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
                  <p className="notice">
                    {t(
                      `พบ JSON ${result.merged} ก้อนต่อกัน — รวมเป็นอาร์เรย์เดียวให้แล้ว`,
                      `Found ${result.merged} JSON chunks — merged into one array`
                    )}
                  </p>
                )}
                {view === 'code' ? <CodeView code={output} /> : <JsonTree data={value} />}
              </div>
            )}
          </div>
        </section>
      </div>

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
