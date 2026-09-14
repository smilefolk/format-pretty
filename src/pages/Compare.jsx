import { useMemo, useState } from 'react'
import Editor from '../components/Editor'
import OptionsPanel, { OptionGroup } from '../components/shell/OptionsPanel'
import { OptionsSlot, StatusSlot } from '../components/shell/slots'
import { Badge, PaneHead, Segmented, Toggle } from '../components/ui'
import { useCompareActions, usePublishActions } from '../hooks/useActions'
import { countKeys, diffJsonWithMeta, preview, summarize, toReport, typeLabel } from '../lib/diff'
import { useT } from '../lib/i18n'
import { parseJson } from '../lib/json'

// ลำดับชนิดในตัวกรองและแถบสัดส่วน (ตรง mock 3a)
const TYPES = ['changed', 'type', 'removed', 'added']
const FILTERS = [
  { value: 'all', th: 'ทั้งหมด', en: 'All' },
  { value: 'changed', th: 'ค่าต่างกัน', en: 'Changed' },
  { value: 'type', th: 'ชนิดต่างกัน', en: 'Type' },
  { value: 'removed', th: 'เฉพาะซ้าย', en: 'Left only' },
  { value: 'added', th: 'เฉพาะขวา', en: 'Right only' },
]

export default function Compare({
  left,
  setLeft,
  right,
  setRight,
  strategy,
  setStrategy,
  arrayKey,
  setArrayKey,
  showEqual,
  setShowEqual,
  notify,
}) {
  const t = useT()
  const [filter, setFilter] = useState('all')
  // คำค้นเส้นทาง — state เฉพาะ UI ของหน้า (ไม่อยู่ใน doc)
  const [query, setQuery] = useState('')

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

  // จับคู่ด้วยคีย์เฉพาะเมื่อเลือก strategy นั้นและมีชื่อคีย์; ชื่อว่าง = เทียบตามลำดับ
  const keyName = strategy === 'key' ? arrayKey.trim() : ''
  const { diffs, fallbacks } = useMemo(
    () =>
      pair.ready
        ? diffJsonWithMeta(pair.a, pair.b, { arrayKey: keyName || null, includeEqual: showEqual })
        : { diffs: [], fallbacks: [] },
    [pair.ready, pair.a, pair.b, keyName, showEqual]
  )
  const keys = useMemo(
    () => (pair.ready ? countKeys(pair.a, pair.b, { arrayKey: keyName || null }) : null),
    [pair.ready, pair.a, pair.b, keyName]
  )

  // นับเฉพาะความต่าง (ไม่รวมแถว equal ที่มาจาก showEqual)
  const counts = useMemo(() => summarize(diffs), [diffs])
  const total = TYPES.reduce((n, type) => n + counts[type], 0)
  const needle = query.trim().toLowerCase()
  const shown = diffs.filter(
    (d) =>
      (filter === 'all' || d.type === filter) &&
      (!needle || d.path.toLowerCase().includes(needle))
  )

  const actions = useCompareActions({
    left,
    right,
    setLeft,
    setRight,
    ready: pair.ready,
    diffs,
    toReport,
    notify,
  })
  usePublishActions(actions)

  const sideBadge = (result) =>
    result.empty ? (
      <Badge variant="neutral">{t('ว่าง', 'Empty')}</Badge>
    ) : result.ok ? (
      <Badge variant="ok">{t('ถูกต้อง', 'Valid')}</Badge>
    ) : (
      <Badge variant="danger" title={result.error.message}>
        {t('ผิดพลาด', 'Invalid')} · {t('บรรทัด', 'line')} {result.error.line ?? '?'}
      </Badge>
    )

  return (
    <>
      <div className="compare-page">
        <div className="compare-inputs">
          <section className="pane source">
            <PaneHead th="ก้อนซ้าย" en="Left" badge={sideBadge(leftResult)}>
              <span className="pane-meta">
                {left.split('\n').length} {t('บรรทัด', 'lines')}
              </span>
            </PaneHead>
            <Editor
              dense
              value={left}
              onChange={setLeft}
              errorLine={leftResult.error?.line}
              label={t('ก้อนซ้าย', 'Left')}
              placeholder={'วาง JSON ก้อนแรกที่นี่\nหรือวางสองก้อนต่อกันในช่องนี้ช่องเดียว แล้วเว้นช่องขวาไว้'}
            />
          </section>
          <section className="pane">
            <PaneHead th="ก้อนขวา" en="Right" badge={sideBadge(rightResult)}>
              <button className="btn small" onClick={actions.swap}>
                {t('สลับซ้าย–ขวา', 'Swap sides')}
              </button>
            </PaneHead>
            <Editor
              dense
              value={right}
              onChange={setRight}
              errorLine={rightResult.error?.line}
              label={t('ก้อนขวา', 'Right')}
              placeholder="วาง JSON ก้อนที่สองที่นี่"
            />
          </section>
        </div>

        <section className="pane diff-panel">
          <PaneHead
            th="จุดที่ต่างกัน"
            en="Differences"
            badge={
              !pair.ready ? (
                <Badge variant="neutral">{t('รอข้อมูล', 'Waiting')}</Badge>
              ) : total === 0 ? (
                <Badge variant="ok">{t('เหมือนกัน', 'Identical')}</Badge>
              ) : (
                <Badge variant="danger">
                  {total} {t('จุด', total === 1 ? 'diff' : 'diffs')}
                </Badge>
              )
            }
          >
            <input
              type="search"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ค้นหาเส้นทาง…', 'Search path…')}
              aria-label={t('ค้นหาเส้นทาง', 'Search path')}
            />
            <button className="btn small" onClick={actions.copyReport}>
              {t('คัดลอกรายงาน', 'Copy report')}
            </button>
          </PaneHead>

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
                {(autoSplit || fallbacks.length > 0) && (
                  <div className="notices">
                    {autoSplit && (
                      <p className="notice">พบ JSON 2 ก้อนในช่องซ้าย — แยกเป็นก้อนซ้าย/ขวาให้อัตโนมัติ</p>
                    )}
                    {fallbacks.length > 0 && (
                      <p className="notice">
                        บางอาร์เรย์ไม่มีคีย์ "{keyName}" ครบ — เทียบตามลำดับแทน ({fallbacks.join(', ')})
                      </p>
                    )}
                  </div>
                )}

                {total === 0 && !showEqual ? (
                  <p className="placeholder same">ข้อมูลสองก้อนเหมือนกันทุกประการ</p>
                ) : shown.length === 0 ? (
                  <p className="placeholder">
                    {needle ? `ไม่พบเส้นทางที่ตรงกับ "${query.trim()}"` : 'ไม่มีรายการในตัวกรองนี้'}
                  </p>
                ) : (
                  <div className="diff-list">
                    {shown.map((d) => (
                      <div
                        key={d.path + d.type}
                        className={`diff-row ${d.type}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => actions.copyPath(d.path)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            actions.copyPath(d.path)
                          }
                        }}
                        title={t('คลิกเพื่อคัดลอกเส้นทาง', 'Click to copy the path')}
                      >
                        <Badge variant={d.type}>{typeLabel(d.type)}</Badge>
                        <span className="diff-path" title={d.path}>
                          <code>{d.path}</code>
                          <span className="diff-copy-chip" aria-hidden="true">
                            {t('คัดลอก', 'copy')}
                          </span>
                        </span>
                        <span className="diff-kinds">
                          {d.kinds ? `${d.kinds[0]} → ${d.kinds[1]}` : ''}
                        </span>
                        <div className="diff-values">
                          {d.type === 'added' ? (
                            <span className="diff-missing">{t('ไม่มีในก้อนซ้าย', 'Not in left')}</span>
                          ) : (
                            <code className="diff-pill left">{preview(d.left)}</code>
                          )}
                          {d.type === 'removed' ? (
                            <span className="diff-missing">{t('ไม่มีในก้อนขวา', 'Not in right')}</span>
                          ) : (
                            <code className="diff-pill right">{preview(d.right)}</code>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <OptionsSlot>
        <OptionsPanel th="ตัวกรอง" en="Filter">
          <OptionGroup>
            <div className="filter-list" role="radiogroup" aria-label={t('ตัวกรองชนิด', 'Filter by type')}>
              {FILTERS.map((f) => {
                const selected = filter === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={selected ? 'filter-item selected' : 'filter-item'}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.value !== 'all' && (
                      <span className="filter-swatch" style={{ background: `var(--diff-${f.value})` }} />
                    )}
                    <span className="filter-label">{t(f.th, f.en)}</span>
                    <span className="filter-count">{f.value === 'all' ? total : counts[f.value]}</span>
                  </button>
                )
              })}
            </div>
          </OptionGroup>
          <OptionGroup th="วิธีเทียบ" en="Strategy">
            <Segmented
              vertical
              options={[
                { value: 'index', label: t('อาร์เรย์เทียบตามลำดับ', 'Arrays by index') },
                {
                  value: 'key',
                  label: (
                    <>
                      {t('จับคู่ด้วยคีย์', 'Match by key')} <code>{arrayKey.trim() || 'id'}</code>
                    </>
                  ),
                },
              ]}
              value={strategy}
              onChange={setStrategy}
              ariaLabel={t('วิธีเทียบ', 'Strategy')}
            />
            {strategy === 'key' && (
              <label className="key-field">
                <span>{t('ชื่อคีย์', 'Key')}</span>
                <input
                  type="text"
                  value={arrayKey}
                  onChange={(e) => setArrayKey(e.target.value)}
                  placeholder="id"
                  spellCheck={false}
                />
              </label>
            )}
            <Toggle
              checked={showEqual}
              onChange={setShowEqual}
              th="แสดงค่าที่เหมือนกันด้วย"
              en="Show equal"
            />
          </OptionGroup>
          <OptionGroup th="สรุป" en="Summary">
            <div className="summary-card">
              <div className="summary-head">
                <span className={total === 0 ? 'summary-total accent' : 'summary-total danger'}>
                  {pair.ready ? total : '—'}
                </span>
                <span className="summary-label">{t('จุดที่ต่างกัน', 'differences')}</span>
              </div>
              {total > 0 && (
                <div className="summary-bar" aria-hidden="true">
                  {TYPES.filter((type) => counts[type] > 0).map((type) => (
                    <span
                      key={type}
                      style={{ flex: counts[type], background: `var(--diff-${type})` }}
                    />
                  ))}
                </div>
              )}
              <div className="summary-keys">
                {keys ? keys.matched : '—'} {t('คีย์ที่ตรงกัน', 'matched')} · {keys ? keys.total : '—'}{' '}
                {t('คีย์รวม', 'total keys')}
              </div>
            </div>
          </OptionGroup>
        </OptionsPanel>
      </OptionsSlot>

      <StatusSlot>
        {!pair.ready ? (
          <span>○ WAITING</span>
        ) : total === 0 ? (
          <span className="status-ok">● IDENTICAL</span>
        ) : (
          <span className="status-danger">● {total} DIFFS</span>
        )}
        <span>{keyName ? `BY KEY ${keyName}` : 'BY INDEX'}</span>
        <span>DEEP</span>
      </StatusSlot>
    </>
  )
}
