# syntax=docker/dockerfile:1

# ---- ขั้นตอน build ----
FROM node:24-alpine AS build
WORKDIR /app

# ติดตั้ง dependency ก่อน เพื่อให้ layer นี้ถูก cache ไว้เวลาแก้แค่โค้ด
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# คัดลอกเฉพาะไฟล์ที่ vite ใช้ build จริง — แก้ README/docs/scripts แล้ว layer นี้จะได้ไม่หลุด cache
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---- ขั้นตอนเสิร์ฟไฟล์ static ----
FROM nginx:1.30-alpine AS runtime

COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine ไม่มี curl ติดมา ใช้ wget ของ busybox แทน
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
