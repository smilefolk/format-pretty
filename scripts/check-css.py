#!/usr/bin/env python3
# ทุก class selector ใน styles.css ต้องปรากฏใน src/**/*.jsx|js — class ที่ประกอบแบบ dynamic ระบุใน DYNAMIC
import re, glob, sys
css = open('src/styles.css', encoding='utf-8').read()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)                     # ตัดคอมเมนต์
css = re.sub(r'url\([^)]*\)', '', css)                              # ตัด url(...)
selectors = set()
for block in re.findall(r'([^{}]+)\{', css):
    for m in re.finditer(r'\.([A-Za-z_][\w-]*)', block): selectors.add(m.group(1))
src = ''
for f in glob.glob('src/**/*.js*', recursive=True): src += open(f, encoding='utf-8').read() + '\n'
tokens = set(re.findall(r'[A-Za-z_][\w-]*', src))
# class ที่ประกอบจากตัวแปร: tok-${type}, badge ${variant}/${d.type}, diff-row ${d.type}, doc-tab-dot ${status}
DYNAMIC = {
  'tok-key','tok-string','tok-number','tok-boolean','tok-null','tok-punct',
  'ok','danger','neutral','changed','type','removed','added','equal','empty',
}
unused = sorted(s for s in selectors if s not in tokens and s not in DYNAMIC)
# ตรวจกลับ: token ที่ตรงชื่อ class แต่ไม่ได้อยู่ใน className (เช่น 'compare' ใน doc.tool) → เตือนให้ดูเอง
suspicious = sorted(s for s in selectors - set(unused) - DYNAMIC if not re.search(r'className=[^>]*\b' + re.escape(s) + r'\b|[\'"`]' + re.escape(s) + r'[\'"` ]|\b' + re.escape(s) + r'\b[^:]*(?:className|class)', src))
print('unused:', unused or '-')
print('suspicious (ชื่อชนกับ token อื่น ตรวจเอง):', suspicious or '-')
sys.exit(1 if unused else 0)
