# ---- ขั้นตอน build ----
FROM node:22-alpine AS build
WORKDIR /app

# ติดตั้ง dependency ก่อน เพื่อให้ layer นี้ถูก cache ไว้เวลาแก้แค่โค้ด
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- ขั้นตอนเสิร์ฟไฟล์ static ----
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
