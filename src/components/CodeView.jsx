import { useMemo } from 'react'
import { tokenize } from '../lib/json'

export default function CodeView({ code }) {
  const lines = useMemo(() => code.split('\n'), [code])
  const tokens = useMemo(() => tokenize(code), [code])

  return (
    <div className="code-view">
      <div className="gutter" aria-hidden="true">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="code">
        {tokens.map((t, i) => (
          <span key={i} className={`tok-${t.type}`}>
            {t.text}
          </span>
        ))}
      </pre>
    </div>
  )
}
