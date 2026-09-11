import { L } from '../../lib/i18n'

// สวิตช์เปิด/ปิด track 32×18 + label สองภาษาแบบซ้อน (ไทยบน อังกฤษล่าง)
export default function Toggle({ checked, onChange, th, en }) {
  return (
    <button
      type="button"
      className="toggle"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-track">
        <span className="toggle-knob" />
      </span>
      <L th={th} en={en} stack panel className="toggle-label" />
    </button>
  )
}
