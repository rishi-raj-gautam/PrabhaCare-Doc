import jsPDF from 'jspdf'

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  let line = ''
  let yy = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const width = doc.getTextWidth(testLine)
    if (width <= maxWidth) {
      line = testLine
    } else {
      doc.text(line, x, yy)
      line = word
      yy += lineHeight
    }
  }
  if (line) doc.text(line, x, yy)
  return yy + lineHeight
}

export function generatePrescriptionPdf({ patient, doctor, consult }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 36
  let y = 48
  const lineHeight = 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('e-Prescription (CareOS)', marginX, y)

  y += 28
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Patient: ${patient?.name || '-'}`, marginX, y)
  y += lineHeight
  doc.text(`Age: ${patient?.age ?? '-'}`, marginX, y)
  y += lineHeight
  doc.text(`Blood Group: ${patient?.bloodGroup || '-'}`, marginX, y)
  y += lineHeight
  doc.text(`Doctor: ${doctor?.name || '-'}`, marginX, y)
  y += lineHeight
  doc.text(`Record ID: ${consult?.recordId || '-'}`, marginX, y)

  y += 18

  doc.setFont('helvetica', 'bold')
  doc.text('Diagnoses', marginX, y)
  y += lineHeight

  doc.setFont('helvetica', 'normal')
  const diagnoses = (consult?.diagnoses || []).length ? consult.diagnoses : ['-']
  y = wrapText(doc, diagnoses.join(', '), marginX, y, pageWidth - marginX * 2, lineHeight)

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Medicines', marginX, y)
  y += lineHeight
  doc.setFont('helvetica', 'normal')

  const meds = consult?.medicines || []
  if (!meds.length) {
    y = wrapText(doc, '-', marginX, y, pageWidth - marginX * 2, lineHeight)
  } else {
    for (const m of meds) {
      const line = `${m.name} ${m.dosage || ''} | ${m.frequency || ''} | ${m.duration || ''}`
      y = wrapText(doc, line.trim(), marginX, y, pageWidth - marginX * 2, lineHeight)
      if (m.instructions) {
        doc.setFont('helvetica', 'italic')
        y = wrapText(doc, `Instructions: ${m.instructions}`, marginX + 10, y, pageWidth - marginX * 2, lineHeight)
        doc.setFont('helvetica', 'normal')
      }
      y += 2
    }
  }

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Notes / Special Instructions', marginX, y)
  y += lineHeight
  doc.setFont('helvetica', 'normal')
  y = wrapText(
    doc,
    consult?.notes || consult?.specialInstructions || '-',
    marginX,
    y,
    pageWidth - marginX * 2,
    lineHeight
  )

  if (consult?.testRecommendations?.length) {
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Recommended Tests', marginX, y)
    y += lineHeight
    doc.setFont('helvetica', 'normal')
    y = wrapText(
      doc,
      consult.testRecommendations.join(', '),
      marginX,
      y,
      pageWidth - marginX * 2,
      lineHeight
    )
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  y = doc.internal.pageSize.getHeight() - 26
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y)

  return doc.output('datauristring')
}

