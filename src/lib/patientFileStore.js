import { get, set, del } from 'idb-keyval'
import { fileToDataUrl } from './fileUtils'

function makeFileKey(patientId, recordId, fileId) {
  return `careos:file:v1:${patientId}:${recordId}:${fileId}`
}

export async function storePatientFile({ patientId, recordId, file, fileId }) {
  const dataUrl = await fileToDataUrl(file)
  const key = makeFileKey(patientId, recordId, fileId)
  await set(key, {
    dataUrl,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size || 0,
    storedAtISO: new Date().toISOString(),
  })
  return { fileKey: key, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size || 0 }
}

export async function getPatientFile(fileKey) {
  if (!fileKey) return null
  return get(fileKey)
}

export async function deletePatientFile(fileKey) {
  if (!fileKey) return
  await del(fileKey)
}

