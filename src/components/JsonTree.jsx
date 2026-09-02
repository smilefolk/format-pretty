import { useState } from 'react'

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

function Node({ name, value, depth, defaultOpen }) {
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

  return (
    <div>
      <div className="tree-row" style={{ paddingLeft: depth * 16 }}>
        <button
          className="tree-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'ยุบ' : 'ขยาย'}
        >
          {open ? '▾' : '▸'}
        </button>
        {name !== undefined && <span className="tok-key">"{name}"</span>}
        {name !== undefined && <span className="tok-punct">: </span>}
        <span className="tok-punct">{openB}</span>
        {!open && (
          <>
            <span className="tree-count">
              {entries.length} {t === 'array' ? 'รายการ' : 'คีย์'}
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
              depth={depth + 1}
              defaultOpen={defaultOpen}
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

export default function JsonTree({ data, defaultOpen = 2 }) {
  return (
    <div className="tree">
      <Node value={data} depth={0} defaultOpen={defaultOpen} />
    </div>
  )
}
