import { useLang } from '../../lib/i18n'

// ตาราง 2×2 ของสถิติ — caption สองภาษาในบรรทัดเดียว "คีย์ · KEYS" (โหมด en เหลือแค่ "Keys")
export default function StatGrid({ items }) {
  const lang = useLang()
  const caption = ({ th, en }) =>
    lang === 'en' ? en || th : en ? `${th} · ${en.toUpperCase()}` : th
  return (
    <div className="stat-grid">
      {items.map((item) => (
        <div className="stat" key={item.en || item.th}>
          <div className={item.accent ? 'stat-value accent' : 'stat-value'}>{item.value}</div>
          <div className="stat-caption">{caption(item)}</div>
        </div>
      ))}
    </div>
  )
}
