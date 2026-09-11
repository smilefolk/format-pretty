// ปุ่มคีย์ลัด เช่น ⌘K — variant `primary` สำหรับวางในปุ่มมินต์
export default function KeyCap({ variant, children }) {
  return <kbd className={variant === 'primary' ? 'keycap primary' : 'keycap'}>{children}</kbd>
}
