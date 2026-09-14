import { LangSwitch, useT } from '../../lib/i18n'
import { IconButton, KeyCap } from '../ui'

// แถบบน: brand | ช่อง DocTabs (#14) | ⌘K · TH/EN · ธีม · (ปุ่มเปิด options เฉพาะจอแคบ)
export default function TopBar({
  theme,
  onThemeToggle,
  onLangChange,
  onCommandPalette,
  hasOptions = false,
  optionsOpen = false,
  onToggleOptions,
  optionsButtonRef,
  children,
}) {
  const t = useT()
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <span className="top-bar-logo" aria-hidden="true">
          FP
        </span>
        <h1 className="top-bar-wordmark">FormatPritty</h1>
      </div>

      <div className="top-bar-tabs">{children}</div>

      <div className="top-bar-tools">
        <button type="button" className="cmd-hint" onClick={onCommandPalette}>
          {t('ค้นหาคำสั่ง', 'Commands')}
          <KeyCap>⌘K</KeyCap>
        </button>
        <LangSwitch onChange={onLangChange} />
        <IconButton label={t('สลับธีม', 'Toggle theme')} onClick={onThemeToggle}>
          {theme === 'dark' ? '☀︎' : '☾'}
        </IconButton>
        {hasOptions && (
          <IconButton
            ref={optionsButtonRef}
            className="only-narrow"
            label={t('ตัวเลือก', 'Options')}
            aria-expanded={optionsOpen}
            aria-controls="shell-options"
            onClick={onToggleOptions}
          >
            ☰
          </IconButton>
        )}
      </div>
    </header>
  )
}
