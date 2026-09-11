import { useLang } from '../../lib/i18n'

// แถบล่าง mono 11px — children มาจาก <StatusSlot> ของหน้า, โน้ตความเป็นส่วนตัวชิดขวาเสมอ
export default function StatusStrip({ children, slotRef }) {
  const lang = useLang()
  return (
    <footer className="status-strip">
      <div className="status-strip-items" ref={slotRef}>
        {children}
      </div>
      <span className="status-strip-note">
        {lang === 'en'
          ? 'Nothing leaves this device'
          : 'ประมวลผลในเบราว์เซอร์ · NOTHING LEAVES THIS DEVICE'}
      </span>
    </footer>
  )
}
