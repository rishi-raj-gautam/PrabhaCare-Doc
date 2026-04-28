export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export function dataUrlToBlob(dataUrl) {
  const [meta, base64] = String(dataUrl).split(',')
  const mime = meta.match(/data:(.*);base64/)?.[1] || 'application/octet-stream'
  const byteString = atob(base64)
  const len = byteString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = byteString.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

