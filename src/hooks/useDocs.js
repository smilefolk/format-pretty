import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  activeDoc,
  createDoc,
  deserializeDocs,
  docsReducer,
  initialDocsState,
  serializeDocs,
} from '../lib/docs'

const STORAGE_KEY = 'fp-docs'
const SAVE_DELAY = 300

// โหลดจาก localStorage — อ่านไม่ได้ / version ไม่ตรง / ไม่มี → เริ่มใหม่เงียบ ๆ ด้วย doc เปล่า 1 อัน
function load() {
  try {
    return deserializeDocs(localStorage.getItem(STORAGE_KEY)) ?? initialDocsState('format')
  } catch {
    return initialDocsState('format')
  }
}

// state ของเอกสารทั้งหมด + persist ลง `fp-docs` — reducer จริงอยู่ใน lib/docs.js (pure, ทดสอบด้วย node)
export default function useDocs({ notify } = {}) {
  const [state, dispatch] = useReducer(docsReducer, undefined, load)

  // เก็บ notify / state ล่าสุดไว้ใน ref เพื่อไม่ให้ callback ด้านล่างเปลี่ยน identity ทุก render
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  const stateRef = useRef(state)
  stateRef.current = state

  // ขนาด JSON ที่เขียนไม่สำเร็จล่าสุด — ไม่ลองซ้ำ (และไม่ toast ซ้ำ) จนกว่าเนื้อหาจะเล็กกว่านั้น
  const failedSize = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const json = serializeDocs(state)
      if (failedSize.current && json.length >= failedSize.current) return
      try {
        localStorage.setItem(STORAGE_KEY, json)
        failedSize.current = 0
      } catch {
        if (!failedSize.current) notifyRef.current?.('บันทึกเอกสารไม่ได้ (พื้นที่เต็ม)')
        failedSize.current = json.length
      }
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [state])

  const open = useCallback((tool, overrides) => {
    const doc = createDoc(tool, overrides, stateRef.current.docs)
    dispatch({ type: 'open', doc })
    return doc
  }, [])

  const close = useCallback((id) => dispatch({ type: 'close', id }), [])
  const rename = useCallback((id, name) => dispatch({ type: 'rename', id, name }), [])
  const update = useCallback((id, patch) => dispatch({ type: 'update', id, patch }), [])
  const activate = useCallback((id) => dispatch({ type: 'activate', id }), [])

  // คลิก rail (D1 b): กลับไป doc ล่าสุดของเครื่องมือนั้น ไม่มีก็สร้างใหม่ — doc เปล่าที่ active เปลี่ยน
  // เครื่องมือแทน (#67) กติกาทั้งหมดอยู่ใน reducer (ทดสอบด้วย node)
  const openTool = useCallback((tool) => dispatch({ type: 'openTool', tool }), [])

  return {
    docs: state.docs,
    activeId: state.activeId,
    doc: activeDoc(state),
    open,
    close,
    rename,
    update,
    activate,
    openTool,
  }
}
