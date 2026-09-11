import { useT } from '../lib/i18n'

// การ์ด error แบบ option 1b — วางใต้ source pane (เหนือ action bar): เหตุผลภาษาไทย, chip line:column,
// ปุ่ม "ไปที่บรรทัด n" (เรียก onGoTo(line) → Editor.focusLine) และ "แก้ให้อัตโนมัติ" (เฉพาะเมื่อส่ง onFix มา — #33)
// หน้า Unwrap ใช้ซ้ำสำหรับสถานะล้มเหลว โดยส่งเนื้อหาเพิ่ม (เช่น <pre class="peeled">) มาทาง children
export default function ErrorCard({ title, message, line, column, onGoTo, onFix, children }) {
  const t = useT()
  const hasPosition = Number.isInteger(line)
  const canGoTo = hasPosition && typeof onGoTo === 'function'

  return (
    <div className="error-card" role="alert">
      <div className="error-card-head">
        <strong>{title}</strong>
        {hasPosition && (
          <code className="error-card-pos">
            {line}:{column ?? 1}
          </code>
        )}
      </div>
      {message && <p className="error-card-message">{message}</p>}
      {children}
      {(onFix || canGoTo) && (
        <div className="error-card-actions">
          {onFix && (
            <button type="button" className="btn danger" onClick={onFix}>
              {t('แก้ให้อัตโนมัติ', 'Fix automatically')}
            </button>
          )}
          {canGoTo && (
            <button type="button" className="btn secondary" onClick={() => onGoTo(line)}>
              {t(`ไปที่บรรทัด ${line}`, `Go to line ${line}`)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
