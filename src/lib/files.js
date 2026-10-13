// Bỏ dấu tiếng Việt và ký tự lạ để làm key Storage an toàn
export function safeFileName(name) {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1) : ''
  const clean = (s) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const b = clean(base).slice(0, 60) || 'file'
  const e = clean(ext).toLowerCase()
  return e ? `${b}.${e}` : b
}

// Lấy tên file gốc để hiển thị từ đường dẫn Storage
export function displayFileName(path) {
  if (!path) return ''
  return path.split('/').pop()
}

// Thu nhỏ ảnh chụp từ điện thoại (thường 3–8MB) trước khi tải lên.
// Nếu trình duyệt không đọc được ảnh (vd. HEIC), trả về file gốc.
export async function compressImage(file, maxSide = 1800, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
