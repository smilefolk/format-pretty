import { L } from '../../lib/i18n'

// หัว pane: ชื่อไทย + sub-label EN, ป้ายสถานะต่อท้าย, ส่วน children ชิดขวา (ปุ่ม / meta)
export default function PaneHead({ th, en, badge, children }) {
  return (
    <div className="pane-head">
      <h2>
        <L th={th} en={en} />
      </h2>
      {badge}
      {children != null && children !== false && <div className="pane-actions">{children}</div>}
    </div>
  )
}
