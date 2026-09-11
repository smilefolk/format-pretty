import { Fragment, useMemo, useRef } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import ErrorCard from '../components/ErrorCard'
import JsonTree from '../components/JsonTree'
import OptionsPanel, { OptionGroup } from '../components/shell/OptionsPanel'
import { OptionsSlot, StatusSlot } from '../components/shell/slots'
import { Badge, KeyCap, PaneHead, Segmented, StatGrid, Toggle } from '../components/ui'
import { INDENT_OPTIONS, VIEW_OPTIONS } from '../lib/constants'
import { useLang, useT } from '../lib/i18n'
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

export default function Unwrap({
  input,
  setInput,
  indent,
  setIndent,
  view,
  setView,
  deep,
  setDeep,
  repeat,
  setRepeat,
  notify,
  sendToFormatter,
}) {
  const t = useT()
  const lang = useLang()
  const editorRef = useRef(null)

  const result = useMemo(() => unwrapJson(input), [input])

  const nested = useMemo(
    () =>
      result.ok && deep
        ? unwrapNested(result.value, { repeat })
        : { value: result.value, count: 0, fields: [], passes: 1 },
    [result, deep, repeat]
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
          <PaneHead
            th="ผลลัพธ์ JSON"
            en="Result"
            badge={
              result.ok ? (
                <Badge variant="ok">
                  {chain.length > 0
                    ? `${t('แกะสำเร็จ', 'Unwrapped')} ${chain.length} ${t('ชั้น', 'layers')}`
                    : t('เป็น JSON อยู่แล้ว', 'Already JSON')}
                </Badge>
              ) : result.empty ? (
                <Badge variant="neutral">{t('ว่าง', 'Empty')}</Badge>
              ) : (
                <Badge variant="danger">{t('แกะไม่สำเร็จ', 'Failed')}</Badge>
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
              <p className="placeholder">
                {t('ยังไม่มีข้อมูล — วางสตริง JSON ที่ช่องด้านซ้าย', 'Nothing yet — paste an escaped JSON string on the left')}
              </p>
            )}

            {result.error && (
              <ErrorCard
                title={
                  result.layers > 0
                    ? t('แกะสตริงแล้ว แต่ข้างในไม่ใช่ JSON', 'Unwrapped, but the content is not JSON')
                    : t('แกะเป็น JSON ไม่ได้', 'Cannot unwrap to JSON')
                }
                message={result.error.message}
                line={result.error.line}
                column={result.error.column}
              >
                {result.layers > 0 && (
                  <>
                    <p className="error-card-note">
                      {t(
                        `ข้อความหลังแกะ ${result.layers} ชั้น (ตำแหน่งข้างต้นอ้างอิงข้อความนี้):`,
                        `Text after peeling ${result.layers} layer(s) — the position above refers to it:`
                      )}
                    </p>
                    <pre className="peeled">{result.peeled}</pre>
                  </>
                )}
              </ErrorCard>
            )}

            {result.ok && (
              <div className="result">
                {chain.length === 0 && result.merged <= 1 && (
                  <p className="result-hint">{t('ข้อมูลนี้เป็น JSON อยู่แล้ว ไม่ต้องแกะ', 'Already valid JSON — nothing to unwrap')}</p>
                )}
                {result.merged > 1 && (
                  <p className="notice">
                    {t(`พบ JSON ${result.merged} ก้อนต่อกัน — รวมเป็นอาร์เรย์เดียวให้แล้ว`, `Found ${result.merged} JSON chunks — merged into one array`)}
                  </p>
                )}
                {view === 'code' ? <CodeView code={output} /> : <JsonTree data={nested.value} />}
              </div>
            )}
          </div>

          <div className="action-bar">
            <button
              className="btn secondary"
              onClick={() => (output ? sendToFormatter(output) : notify('ยังไม่มีผลลัพธ์'))}
            >
              {t('ส่งไปหน้าจัดรูปแบบ', 'Send to Formatter')}
            </button>
            <div className="spacer" />
            <span className="pane-meta">
              {stats ? `${stats.lines} ${t('บรรทัด', 'lines')} · ${stats.keys} ${t('คีย์', 'keys')}` : '—'}
            </span>
          </div>
        </section>
      </div>

      <OptionsSlot>
        <OptionsPanel th="ตั้งค่า" en="Options">
          <OptionGroup>
            <Toggle checked={deep} onChange={setDeep} th="แกะสตริงในฟิลด์ย่อย" en="Deep unwrap" />
            <Toggle checked={repeat} onChange={setRepeat} th="แกะซ้ำจนสุด" en="Repeat until stable" />
          </OptionGroup>
          <OptionGroup th="ระยะเยื้อง" en="Indent">
            <Segmented
              options={INDENT_OPTIONS.map((o) => ({ ...o, label: t(o.th, o.en) }))}
              value={indent}
              onChange={setIndent}
              ariaLabel={t('ระยะเยื้อง', 'Indent')}
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
          <OptionGroup th="การแกะ" en="Result">
            <StatGrid
              items={[
                { th: 'ชั้น', en: 'Layers', value: result.ok ? chain.length : '—', accent: true },
                { th: 'ฟิลด์', en: 'Fields', value: result.ok ? nested.count : '—' },
                { th: 'คีย์', en: 'Keys', value: stats ? stats.keys : '—' },
                { th: 'ความลึก', en: 'Depth', value: stats ? stats.depth : '—' },
              ]}
            />
          </OptionGroup>
        </OptionsPanel>
      </OptionsSlot>

      <StatusSlot>
        {result.ok ? (
          <span className="status-ok">{chain.length > 0 ? `● UNWRAPPED ×${chain.length}` : '● JSON'}</span>
        ) : result.empty ? (
          <span>○ EMPTY</span>
        ) : (
          <span className="status-danger">● FAILED</span>
        )}
        {deep && <span>DEEP</span>}
        {repeat && nested.passes > 1 && <span>REPEAT ×{nested.passes}</span>}
        <span>UTF-8</span>
      </StatusSlot>
    </>
  )
}
