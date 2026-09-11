import { createContext, useContext, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ช่องเสียบของ shell — หน้าใน pages/ เรนเดอร์ options panel / status strip ของตัวเอง
// ผ่าน portal เข้า container ที่ AppShell ถืออยู่ (หน้าเป็นคนถือ result/stats จึงไม่ต้อง parse ซ้ำใน App)
// ตอน SSR หรือก่อน container mount จะได้ null → เรนเดอร์ว่างเฉย ๆ

export const ShellSlotContext = createContext({
  options: null,
  status: null,
  register: () => () => {},
})

function Slot({ name, children }) {
  const { [name]: container, register } = useContext(ShellSlotContext)
  // แจ้ง shell ว่ามีคนใช้ช่องนี้อยู่ (ใช้ตัดสินใจโชว์ปุ่ม drawer / เส้นขอบ)
  useEffect(() => register(name), [name, register])
  return container ? createPortal(children, container) : null
}

export const OptionsSlot = ({ children }) => <Slot name="options">{children}</Slot>
export const StatusSlot = ({ children }) => <Slot name="status">{children}</Slot>
