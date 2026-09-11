// ตัวอย่างข้อมูลของทุกเครื่องมือ — ตาม D4 เรียกผ่าน command palette (และปุ่ม "ตัวอย่าง" ของหน้า Unwrap)

export const SAMPLE_FORMAT = `{"name":"FormatPritty","version":"1.0.0","tags":["json","formatter","react"],"config":{"indent":2,"sortKeys":false,"theme":"dark"},"stats":{"users":1284,"rating":4.8,"active":true,"deprecated":null},"authors":[{"name":"Somchai","role":"dev"},{"name":"Malee","role":"design"}]}`

export const SAMPLE_FORMAT_MULTI = `{"id":1,"user":"somchai","action":"login"}
{"id":2,"user":"malee","action":"upload","size":4821}
{"id":3,"user":"somchai","action":"logout"}`

export const SAMPLE_DIFF_LEFT = `{
  "id": 1024,
  "name": "Somchai",
  "active": true,
  "score": 87,
  "roles": ["admin", "editor"],
  "profile": { "city": "Bangkok", "zip": "10110" },
  "legacyField": "ยังอยู่ในก้อนซ้าย"
}`

export const SAMPLE_DIFF_RIGHT = `{
  "id": "1024",
  "name": "Somchai",
  "active": false,
  "score": 87,
  "roles": ["admin", "viewer", "billing"],
  "profile": { "city": "Chiang Mai", "zip": "10110" },
  "newField": "เพิ่มเข้ามาในก้อนขวา"
}`

export const SAMPLE_UNWRAP = `"{\\"order_id\\":\\"A-1024\\",\\"items\\":[{\\"sku\\":\\"X1\\",\\"qty\\":2},{\\"sku\\":\\"Y7\\",\\"qty\\":1}],\\"paid\\":true,\\"note\\":null}"`

// ซ้อนสามชั้น: สตริงชั้นนอก → ฟิลด์ payload → ฟิลด์ customer (chain ตรง mock 3b)
export const SAMPLE_UNWRAP_NESTED = `"{\\"event\\":\\"order.created\\",\\"ts\\":\\"2026-09-02T10:20:30Z\\",\\"payload\\":\\"{\\\\\\"order_id\\\\\\":\\\\\\"A-1024\\\\\\",\\\\\\"customer\\\\\\":\\\\\\"{\\\\\\\\\\\\\\"id\\\\\\\\\\\\\\":7,\\\\\\\\\\\\\\"tier\\\\\\\\\\\\\\":\\\\\\\\\\\\\\"gold\\\\\\\\\\\\\\"}\\\\\\"}\\"}"`
