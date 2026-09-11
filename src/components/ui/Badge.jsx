// ป้ายสถานะ: ok (มินต์) / danger (แดง) / neutral (เทา)
export default function Badge({ variant = 'neutral', children, ...rest }) {
  return (
    <span className={`badge ${variant}`} {...rest}>
      {children}
    </span>
  )
}
