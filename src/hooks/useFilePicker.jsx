import { useCallback, useRef } from 'react'

// <input type="file"> ที่ซ่อนอยู่ + ฟังก์ชันเปิด dialog — หน้าเรนเดอร์ `input` ไว้ที่ไหนก็ได้ แล้วผูก `open` กับปุ่ม/คำสั่ง ⌘K
// (คลิก input ต้องเกิดใน user gesture — keydown ของ palette นับเป็น gesture)
export default function useFilePicker(onFile) {
  const ref = useRef(null)
  const open = useCallback(() => ref.current?.click(), [])
  const input = (
    <input
      ref={ref}
      type="file"
      accept=".json,.txt,application/json"
      hidden
      onChange={(event) => {
        onFile(event.target.files?.[0])
        event.target.value = ''
      }}
    />
  )
  return { open, input }
}
