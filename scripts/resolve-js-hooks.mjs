// hook สำหรับ node:module.register — เติม .js ให้ import แบบไม่มีนามสกุลใน src/lib (โค้ดจริงพึ่งการ resolve ของ vite)
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('./') && !/\.[a-z]+$/i.test(specifier)) {
    try {
      return await next(`${specifier}.js`, context)
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
    }
  }
  return next(specifier, context)
}
