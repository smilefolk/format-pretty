import { useMemo, useState } from 'react'
import { useT } from '../lib/i18n'
import { childPath } from '../lib/path'

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function Leaf({ value }) {
  const t = typeOf(value)
  const text = t === 'string' ? `"${value}"` : String(value)
  return <span className={`tok-${t === 'object' ? 'null' : t}`}>{text}</span>
}

// path แบบเดียวกับ lib/unwrap.js (root '') ใช้เทียบกับ `unwrapped` — คีย์ของ array เป็นตัวเลข
function Node({ name, value, path, depth, defaultOpen, unwrapped }) {
  const tr = useT()
  const [open, setOpen] = useState(depth < defaultOpen)
  const t = typeOf(value)
  const isBranch = t === 'object' || t === 'array'

  if (!isBranch) {
    return (
      <div className="tree-row" style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && <span className="tok-key">"{name}"</span>}
        {name !== undefined && <span className="tok-punct">: </span>}
        <Leaf value={value} />
      </div>
    )
  }

  const entries = t === 'array' ? value.map((v, i) => [i, v]) : Object.entries(value)
  const [openB, closeB] = t === 'array' ? ['[', ']'] : ['{', '}']
  // โหนดนี้มาจากสตริง JSON ที่ถูกแกะให้ดู (ข้อมูลจริงยังเป็นสตริง) → ติด pill บอกไว้
  const fromString = unwrapped?.has(path)

  return (
    <div>
      <div className="tree-row" style={{ paddingLeft: depth * 16 }}>
        <button
          className="tree-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? tr('ยุบ', 'Collapse') : tr('ขยาย', 'Expand')}
        >
          {open ? '▾' : '▸'}
        </button>
        {name !== undefined && <span className="tok-key">"{name}"</span>}
        {name !== undefined && <span className="tok-punct">: </span>}
        {fromString && (
          <span
            className="tree-unwrapped"
            title={tr('ค่าจริงเป็นสตริง — แกะให้ดูโครงสร้าง', 'Actually a string — unwrapped for display')}
          >
            {tr('สตริง', 'string')}
          </span>
        )}
        <span className="tok-punct">{openB}</span>
        {!open && (
          <>
            <span className="tree-count">
              {entries.length} {t === 'array' ? tr('รายการ', 'items') : tr('คีย์', 'keys')}
            </span>
            <span className="tok-punct">{closeB}</span>
          </>
        )}
      </div>

      {open && (
        <>
          {entries.map(([k, v]) => (
            <Node
              key={k}
              name={t === 'array' ? undefined : k}
              value={v}
              path={childPath(path, k)}
              depth={depth + 1}
              defaultOpen={defaultOpen}
              unwrapped={unwrapped}
            />
          ))}
          <div className="tree-row" style={{ paddingLeft: depth * 16 }}>
            <span className="tok-punct">{closeB}</span>
          </div>
        </>
      )}
    </div>
  )
}

// unwrapped: path (รูปแบบ lib/path.js root '') ของโหนดที่เดิมเป็นสตริง JSON แล้วถูกแกะมาให้ดู (#72)
export default function JsonTree({ data, defaultOpen = 2, unwrapped }) {
  const unwrappedSet = useMemo(() => (unwrapped?.length ? new Set(unwrapped) : null), [unwrapped])
  return (
    <div className="tree">
      <Node value={data} path="" depth={0} defaultOpen={defaultOpen} unwrapped={unwrappedSet} />
    </div>
  )
}
