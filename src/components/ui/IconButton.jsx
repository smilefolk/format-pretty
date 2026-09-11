import { forwardRef } from 'react'

// ปุ่มไอคอน 26×26 — `label` ใช้ทั้ง aria-label และ tooltip; รับ ref เพื่อให้คืน focus ได้ (drawer)
const IconButton = forwardRef(function IconButton({ label, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={className ? `icon-btn ${className}` : 'icon-btn'}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
})

export default IconButton
