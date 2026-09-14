import { L } from '../../lib/i18n'

// หัว pane: ชื่อไทย + sub-label EN, ป้ายสถานะต่อท้าย, ส่วน children ชิดขวา (ปุ่ม / meta)
// id ใส่ที่ <h2> ให้ Editor อ้างเป็น aria-labelledby (ชื่อ pane กับชื่อ textarea จะได้ไม่แยกกัน)
export default function PaneHead({ id, th, en, badge, children }) {
  return (
    <div className="pane-head">
      <h2 id={id}>
        <L th={th} en={en} />
      </h2>
      {badge}
      {children != null && children !== false && <div className="pane-actions">{children}</div>}
    </div>
  )
}
