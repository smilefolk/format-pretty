// ปุ่มไอคอน 26×26 — `label` ใช้ทั้ง aria-label และ tooltip
export default function IconButton({ label, children, ...rest }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}
