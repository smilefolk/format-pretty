// ตัวเลือกแบบ segmented (indent / view / strategy) — radiogroup ตามแบบ ARIA:
// ตัวที่เลือกอยู่รับ Tab (tabIndex 0) ตัวอื่น -1 แล้วใช้ลูกศรเลื่อนตัวเลือก
export default function Segmented({ options, value, onChange, vertical = false, ariaLabel }) {
  const move = (event) => {
    const index = options.findIndex((o) => o.value === value)
    if (index < 0) return
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    event.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus()
  }

  return (
    <div
      className={vertical ? 'segmented vertical' : 'segmented'}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={move}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-value={option.value}
            className={option.mono ? 'mono' : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
