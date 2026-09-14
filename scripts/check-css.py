#!/usr/bin/env python3
# กัน CSS ตายใน src/styles.css — รันจากที่ไหนก็ได้ (path อิงตำแหน่งไฟล์นี้) exit 1 ถ้าเจอ
#   1) class selector ทุกตัวต้องปรากฏใน src/**/*.js|jsx (class ที่ประกอบจากตัวแปรระบุใน DYNAMIC)
#   2) element selector (kbd, select, textarea, …) ต้องมี JSX tag นั้นอยู่จริง
#   3) custom property ที่ประกาศ (--x) ต้องถูกใช้ผ่าน var(--x) อย่างน้อยหนึ่งที่
import glob, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
css = open(os.path.join(ROOT, 'src', 'styles.css'), encoding='utf-8').read()
css_no_comments = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css_no_urls = re.sub(r'url\([^)]*\)', '', css_no_comments)

src = ''
for f in glob.glob(os.path.join(ROOT, 'src', '**', '*.js*'), recursive=True):
    src += open(f, encoding='utf-8').read() + '\n'
tokens = set(re.findall(r'[A-Za-z_][\w-]*', src))
jsx_tags = set(re.findall(r'<([a-z][a-z0-9]*)\b', src))

# class ที่ประกอบจากตัวแปร: tok-${type}, badge ${variant}/${d.type}, diff-row ${d.type}, doc-tab-dot ${status}
DYNAMIC = {
    'tok-key', 'tok-string', 'tok-number', 'tok-boolean', 'tok-null', 'tok-punct',
    'ok', 'danger', 'neutral', 'changed', 'type', 'removed', 'added', 'equal', 'empty',
}
# pseudo/keyword ที่ไม่ใช่ element
NOT_ELEMENTS = {'from', 'to', 'root', 'hover', 'active', 'focus', 'focus-visible', 'focus-within', 'placeholder',
                'before', 'after', 'nth-child', 'even', 'odd', 'not', 'first-child', 'last-child', 'checked', 'disabled', 'has'}

classes, elements = set(), set()
for block in re.findall(r'([^{}]+)\{', css_no_urls):
    if block.strip().startswith('@'):
        continue
    for sel in block.split(','):
        classes.update(re.findall(r'\.([A-Za-z_][\w-]*)', sel))
        # element selector = ชื่อ tag ที่ขึ้นต้น compound selector (ไม่ได้ตามหลัง . # : [ ) เช่น `kbd`, `textarea.input`, `.tabs button`
        for m in re.finditer(r'(?:^|[\s>+~(])([a-z][a-z0-9]*)(?=[\s.#:\[>+~,)]|$)', sel.strip()):
            elements.add(m.group(1))
elements -= NOT_ELEMENTS

declared = set(re.findall(r'^\s*--([\w-]+)\s*:', css_no_comments, flags=re.M))
used_vars = set(re.findall(r'var\(--([\w-]+)', css_no_comments)) | set(re.findall(r'var\(--([\w-]+)', src))

unused_classes = sorted(c for c in classes if c not in tokens and c not in DYNAMIC)
unused_elements = sorted(e for e in elements if e not in jsx_tags and e not in {'html', 'body'})
unused_vars = sorted(v for v in declared if v not in used_vars)

print('unused classes:', unused_classes or '-')
print('element selectors without JSX tag:', unused_elements or '-')
print('custom properties never used:', unused_vars or '-')
sys.exit(1 if (unused_classes or unused_elements or unused_vars) else 0)
