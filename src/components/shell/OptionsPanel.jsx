import { L } from '../../lib/i18n'

// panel ขวา 236px — หน้าเรนเดอร์ผ่าน <OptionsSlot> แล้วใส่ OptionGroup เป็นชั้น ๆ
export default function OptionsPanel({ th, en, children }) {
  return (
    <aside className="options-panel">
      <div className="options-panel-head">
        <L th={th} en={en} />
      </div>
      <div className="options-panel-body">{children}</div>
    </aside>
  )
}

export function OptionGroup({ th, en, children }) {
  return (
    <section className="option-group">
      {th && (
        <div className="option-group-label">
          <L th={th} en={en} panel />
        </div>
      )}
      {children}
    </section>
  )
}
