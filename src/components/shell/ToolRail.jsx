import { useT } from '../../lib/i18n'

// caption เป็น mono caps อังกฤษเสมอตามดีไซน์ ส่วน aria-label ตามภาษาที่เลือก
export const TOOLS = [
  { value: 'format', glyph: '{ }', caption: 'FORMAT', th: 'จัดรูปแบบ JSON', en: 'Format JSON' },
  { value: 'compare', glyph: '⇄', caption: 'DIFF', th: 'เปรียบเทียบ 2 ก้อน', en: 'Compare' },
  { value: 'unwrap', glyph: '"⤷', caption: 'UNWRAP', th: 'สตริง → JSON', en: 'String → JSON' },
]

const README_URL = 'https://github.com/smilefolk/format-pretty#readme'

export default function ToolRail({ active, onSelect }) {
  const t = useT()
  return (
    <nav className="tool-rail" aria-label={t('เครื่องมือ', 'Tools')}>
      {TOOLS.map((tool) => (
        <button
          key={tool.value}
          type="button"
          className="tool-rail-item"
          aria-label={t(tool.th, tool.en)}
          aria-current={active === tool.value ? 'page' : undefined}
          title={t(tool.th, tool.en)}
          onClick={() => onSelect(tool.value)}
        >
          <span className="tool-rail-glyph" aria-hidden="true">
            {tool.glyph}
          </span>
          <span className="tool-rail-caption" aria-hidden="true">
            {tool.caption}
          </span>
        </button>
      ))}
      <span className="tool-rail-spacer" />
      {/* ยังไม่มีหน้า help ในดีไซน์ — ชี้ไป README ไปก่อน */}
      <a
        className="tool-rail-item tool-rail-help"
        href={README_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={t('ช่วยเหลือ', 'Help')}
        title={t('ช่วยเหลือ (README)', 'Help (README)')}
      >
        ?
      </a>
    </nav>
  )
}
