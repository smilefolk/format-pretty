import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OptionsDrawer from './OptionsDrawer'
import { ShellSlotContext } from './slots'
import StatusStrip from './StatusStrip'
import ToolRail from './ToolRail'
import TopBar from './TopBar'

// โครงเต็ม viewport: TopBar / (ToolRail 56 · เนื้อหา · options 236) / StatusStrip
// เนื้อหาของ options / status มาจากหน้าผ่าน slot (ดู slots.jsx)
export default function AppShell({
  tool,
  onSelectTool,
  theme,
  onThemeToggle,
  onLangChange,
  onCommandPalette,
  tabs,
  children,
}) {
  const [containers, setContainers] = useState({ options: null, status: null })
  const [users, setUsers] = useState({ options: 0, status: 0 })
  const optionsButtonRef = useRef(null)

  // callback ref ต้อง identity คงที่ ไม่งั้น React ถอด/ใส่ ref ทุก render แล้ว setState วนไม่รู้จบ
  const setOptionsEl = useCallback(
    (el) => setContainers((c) => (c.options === el ? c : { ...c, options: el })),
    []
  )
  const setStatusEl = useCallback(
    (el) => setContainers((c) => (c.status === el ? c : { ...c, status: el })),
    []
  )

  // นับผู้ใช้ช่อง — มากกว่า 0 แปลว่ามี options panel ให้เปิดเป็น drawer ได้บนจอแคบ
  const register = useCallback((name) => {
    setUsers((u) => ({ ...u, [name]: u[name] + 1 }))
    return () => setUsers((u) => ({ ...u, [name]: u[name] - 1 }))
  }, [])

  const slots = useMemo(() => ({ ...containers, register }), [containers, register])
  const hasOptions = users.options > 0

  const [optionsOpen, setOptionsOpen] = useState(false)
  useEffect(() => {
    if (!hasOptions) setOptionsOpen(false)
  }, [hasOptions])

  return (
    <ShellSlotContext.Provider value={slots}>
      <div className="shell">
        <TopBar
          theme={theme}
          onThemeToggle={onThemeToggle}
          onLangChange={onLangChange}
          onCommandPalette={onCommandPalette}
          hasOptions={hasOptions}
          optionsOpen={optionsOpen}
          onToggleOptions={() => setOptionsOpen((o) => !o)}
          optionsButtonRef={optionsButtonRef}
        >
          {tabs}
        </TopBar>

        <div className="shell-main">
          <ToolRail active={tool} onSelect={onSelectTool} />
          <main className="shell-content">{children}</main>
          <OptionsDrawer
            open={optionsOpen}
            onClose={() => setOptionsOpen(false)}
            returnFocusTo={optionsButtonRef}
            containerRef={setOptionsEl}
            hasOptions={hasOptions}
          />
        </div>

        <StatusStrip slotRef={setStatusEl} />
      </div>
    </ShellSlotContext.Provider>
  )
}
