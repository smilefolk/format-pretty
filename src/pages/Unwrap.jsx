import { Fragment, useMemo, useRef } from 'react'
import CodeView from '../components/CodeView'
import Editor from '../components/Editor'
import ErrorCard from '../components/ErrorCard'
import JsonTree from '../components/JsonTree'
import OptionsPanel, { OptionGroup } from '../components/shell/OptionsPanel'
import { OptionsSlot, StatusSlot } from '../components/shell/slots'
import { Badge, KeyCap, PaneHead, Segmented, StatGrid, Toggle } from '../components/ui'
import { readTextFile, usePublishActions, useUnwrapActions } from '../hooks/useActions'
import useFilePicker from '../hooks/useFilePicker'
import { INDENT_OPTIONS, VIEW_OPTIONS } from '../lib/constants'
import { useLang, useT } from '../lib/i18n'
import { formatBytes, getStats, stringify } from '../lib/json'
import { unwrapJson, unwrapNested } from '../lib/unwrap'

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
  notify,
  sendToFormatter,
  onFileName,
}) {
  const t = useT()
  const lang = useLang()
  const editorRef = useRef(null)

  const result = useMemo(() => unwrapJson(input), [input])

  const nested = useMemo(
    () =>
      result.ok && deep
        ? unwrapNested(result.value)
        : { value: result.value, count: 0, fields: [] },
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

  const loadText = (text, name) => {
    setInput(text)
    onFileName?.(name)
  }
  const readFile = (file) => readTextFile(file, loadText, notify)
  const picker = useFilePicker(readFile)

  const actions = useUnwrapActions({
    input,
    result,
    output,
    layers: chain.length,
    setInput,
    notify,
    sendToFormatter,
    openFile: picker.open,
  })
  usePublishActions(actions)

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      actions.unwrap()
    }
  }

  return (
    <>
      <div className="workbench">
        <section className="pane source">
          <PaneHead id="source-head" th="สตริง JSON" en="Escaped string">
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
            labelledBy="source-head"
            invalid={!!result.error}
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
            <button className="btn primary" onClick={actions.unwrap}>
              {t('แกะสตริง', 'Unwrap')}
              <KeyCap variant="primary">⌘↵</KeyCap>
            </button>
            <div className="spacer" />
            <button className="btn ghost" onClick={actions.openFile}>
              {t('เปิดไฟล์', 'Open file')}
            </button>
            <button
              className="btn ghost"
              onClick={actions.sample}
              title={t('สลับตัวอย่างธรรมดา / ซ้อนในฟิลด์', 'Toggle simple / nested sample')}
            >
              {t('ตัวอย่าง', 'Sample')}
            </button>
            <button className="btn ghost" onClick={actions.clear}>
              {t('ล้าง', 'Clear')}
            </button>
            {picker.input}
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
            <button className="btn small" onClick={actions.copy}>
              {t('คัดลอก', 'Copy')}
            </button>
            <button className="btn small" onClick={actions.download}>
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
              onClick={actions.sendToFormatter}
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
        <span>UTF-8</span>
      </StatusSlot>
    </>
  )
}
