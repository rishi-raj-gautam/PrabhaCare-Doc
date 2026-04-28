export function bpStatus(sys, dia) {
  const s = Number(sys)
  const d = Number(dia)
  if (Number.isNaN(s) || Number.isNaN(d)) return { label: 'Unknown', tone: 'neutral' }
  if (s < 90 || d < 60) return { label: 'Low', tone: 'danger' }
  if (s >= 140 || d >= 90) return { label: 'High', tone: 'warning' }
  return { label: 'Normal', tone: 'success' }
}

export function hrStatus(hr) {
  const v = Number(hr)
  if (Number.isNaN(v)) return { label: 'Unknown', tone: 'neutral' }
  if (v < 50) return { label: 'Low', tone: 'danger' }
  if (v > 100) return { label: 'High', tone: 'warning' }
  return { label: 'Normal', tone: 'success' }
}

export function spo2Status(spo2) {
  const v = Number(spo2)
  if (Number.isNaN(v)) return { label: 'Unknown', tone: 'neutral' }
  if (v < 94) return { label: 'Low', tone: 'danger' }
  return { label: 'Optimal', tone: 'success' }
}

export function glucoseStatus(glucoseFasting) {
  const v = Number(glucoseFasting)
  if (Number.isNaN(v)) return { label: 'Unknown', tone: 'neutral' }
  if (v < 70) return { label: 'Low', tone: 'danger' }
  if (v >= 126) return { label: 'High', tone: 'warning' }
  return { label: 'Optimal', tone: 'success' }
}

export function computeRiskIndicator({ vitals, allergies, chronicDiseases }) {
  const bp = bpStatus(vitals?.bpSys, vitals?.bpDia)
  const hr = hrStatus(vitals?.heartRate)
  const spo2 = spo2Status(vitals?.spo2)
  const glucose = glucoseStatus(vitals?.glucoseFasting)

  let score = 0
  if (bp.tone === 'warning') score += 2
  if (bp.tone === 'danger') score += 3
  if (hr.tone === 'warning') score += 1
  if (hr.tone === 'danger') score += 2
  if (spo2.tone === 'danger') score += 3
  if (glucose.tone === 'warning') score += 2
  if (glucose.tone === 'danger') score += 3

  if (Array.isArray(allergies) && allergies.length) score += 1
  if (Array.isArray(chronicDiseases) && chronicDiseases.length) score += 1

  if (score >= 7) return { level: 'High', tone: 'danger' }
  if (score >= 3) return { level: 'Medium', tone: 'warning' }
  return { level: 'Low', tone: 'success' }
}

