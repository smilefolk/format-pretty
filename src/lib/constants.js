// ค่าคงที่ที่หลายหน้าใช้ร่วมกัน

// ตัวเลือกระยะเยื้อง (Formatter / Unwrap) — value ตรงกับที่ stringify() รับ; th/en ใช้กับ t()
export const INDENT_OPTIONS = [
  { value: '2', th: '2', en: '2', mono: true },
  { value: '4', th: '4', en: '4', mono: true },
  { value: 'tab', th: 'แท็บ', en: 'Tab' },
]

// มุมมองผลลัพธ์ (Formatter / Unwrap)
export const VIEW_OPTIONS = [
  { value: 'code', th: 'โค้ด', en: 'Code' },
  { value: 'tree', th: 'โครงสร้าง', en: 'Tree' },
]
