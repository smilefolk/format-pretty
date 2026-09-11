import { useCallback, useMemo, useRef } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import ErrorCard from '../components/ErrorCard'
import JsonTree from '../components/JsonTree'
import OptionsPanel, { OptionGroup } from '../components/shell/OptionsPanel'
import { OptionsSlot, StatusSlot } from '../components/shell/slots'
import { Badge, KeyCap, PaneHead, Segmented, StatGrid, Toggle } from '../components/ui'
import { INDENT_OPTIONS, VIEW_OPTIONS } from '../lib/constants'
import { fixJson } from '../lib/fix'
import { useT } from '../lib/i18n'
import { formatBytes, getStats, parseJson, sortKeysDeep, stringify } from '../lib/json'

// ไม่ลอง auto-fix กับอินพุตที่ใหญ่กว่านี้ (ไบต์โดยประมาณ) กันหน้าหน่วงตอนพิมพ์
const FIX_LIMIT = 256 * 1024

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
  // ข้อเสนอแก้อัตโนมัติ (#33) — คิดเฉพาะเมื่อผิดพลาดและไฟล์ไม่ใหญ่ (fixJson parse ซ้ำได้ถึง 5 รอบ)
  const fix = useMemo(
    () => (result.error && input.length <= FIX_LIMIT ? fixJson(input) : null),
    [result.error, input]
  )

  const value = useMemo(
    () => (result.ok && sortKeys ? sortKeysDeep(result.value) : result.value),
    [result, sortKeys]
  )

  const output = useMemo(() => (result.ok ? stringify(value, indent) : ''), [result.ok, value, indent])
  const lineEnding = input.includes('\r\n') ? 'CRLF' : 'LF'
  const stats = useMemo(() => (result.ok ? getStats(value, output) : null), [result.ok, value, output])

  const handleFormat = useCallback(() => {
    if (!result.ok) return notify('JSON ไม่ถูกต้อง จัดรูปแบบไม่ได้')
    setInput(output)
    notify('จัดรูปแบบเรียบร้อย')
  }, [result.ok, output, setInput, notify])

  // D7: ไม่ auto-apply — ผู้ใช้กดเอง แล้วแจ้งให้ตรวจสอบ
  const handleFix = () => {
    if (!fix) return
    setInput(fix.fixed)
    notify(`แก้ ${fix.applied.length} จุด — ตรวจสอบก่อนใช้`)
  }

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
          {result.error && (
            <ErrorCard
              title={t('JSON ไม่ถูกต้อง', 'Invalid JSON')}
              message={result.error.message}
              line={result.error.line}
              column={result.error.column}
              onGoTo={(line) => editorRef.current?.focusLine(line)}
              onFix={fix ? handleFix : undefined}
            />
          )}
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
              <p className="placeholder">
                {t(
                  'แก้ข้อผิดพลาดในต้นฉบับก่อน — ผลลัพธ์จะแสดงที่นี่',
                  'Fix the source first — the result will appear here'
                )}
              </p>
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

      <OptionsSlot>
        <OptionsPanel th="ตั้งค่า" en="Options">
          <OptionGroup th="ระยะเยื้อง" en="Indent">
            <Segmented
              options={INDENT_OPTIONS.map((o) => ({ ...o, label: t(o.th, o.en) }))}
              value={indent}
              onChange={setIndent}
              ariaLabel={t('ระยะเยื้อง', 'Indent')}
            />
          </OptionGroup>
          <OptionGroup>
            <Toggle checked={sortKeys} onChange={setSortKeys} th="เรียงคีย์ A→Z" en="Sort keys" />
            <Toggle
              checked={mergeChunks}
              onChange={setMergeChunks}
              th="รวมหลายก้อนเป็นอาร์เรย์"
              en="Merge chunks"
            />
          </OptionGroup>
          <OptionGroup th="มุมมอง" en="View">
            <Segmented
              options={VIEW_OPTIONS.map((o) => ({ ...o, label: t(o.th, o.en) }))}
              value={view}
              onChange={setView}
              ariaLabel={t('มุมมอง', 'View')}
            />
          </OptionGroup>
          <OptionGroup th="สถิติ" en="Stats">
            <StatGrid
              items={[
                { th: 'คีย์', en: 'Keys', value: stats ? stats.keys : '—' },
                { th: 'ความลึก', en: 'Depth', value: stats ? stats.depth : '—' },
                { th: 'ไบต์', en: 'Bytes', value: stats ? stats.bytes : '—' },
                { th: 'บรรทัด', en: 'Lines', value: stats ? stats.lines : '—' },
              ]}
            />
          </OptionGroup>
        </OptionsPanel>
      </OptionsSlot>

      <StatusSlot>
        {result.ok ? (
          <span className="status-ok">● VALID</span>
        ) : result.empty ? (
          <span>○ EMPTY</span>
        ) : (
          <span className="status-danger">● INVALID</span>
        )}
        {result.merged > 1 && <span>MERGED ×{result.merged}</span>}
        <span>UTF-8</span>
        <span>{lineEnding}</span>
        <span>JSON</span>
      </StatusSlot>
    </>
  )
}
