import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type InvoiceStatus = 'paid' | 'unpaid' | 'partial'
type InvoiceTemplate = 'modern' | 'minimal' | 'bold'
type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } }
type RGBColor = [number, number, number]
type StatusPalette = {
  bg: RGBColor
  text: RGBColor
  accent: RGBColor
}

export interface InvoiceData {
  invoiceNumber: string
  customerName: string
  amount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  dueDate: string | null
  notes: string | null
  createdAt: string
  status?: InvoiceStatus
  description?: string
  category?: string
  transactionDate?: string
  businessProfile?: {
    business_name?: string
    business_address?: string
    business_contact?: string
    business_email?: string
  }
  templateStyle?: InvoiceTemplate
}

const fmt = (n: number) =>
  'Rs. ' +
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n)

function formatDate(value: string | null | undefined, fallback = 'On receipt') {
  if (!value) return fallback
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getStatus(status?: string): InvoiceStatus {
  if (status === 'paid' || status === 'partial') {
    return status
  }
  return 'unpaid'
}

function getStatusColors(status: InvoiceStatus): StatusPalette {
  if (status === 'paid') {
    return {
      bg: [220, 252, 231] as RGBColor,
      text: [22, 101, 52] as RGBColor,
      accent: [34, 197, 94] as RGBColor,
    }
  }

  if (status === 'partial') {
    return {
      bg: [254, 243, 199] as RGBColor,
      text: [146, 64, 14] as RGBColor,
      accent: [245, 158, 11] as RGBColor,
    }
  }

  return {
    bg: [254, 226, 226] as RGBColor,
    text: [153, 27, 27] as RGBColor,
    accent: [239, 68, 68] as RGBColor,
  }
}

function buildLineItemDescription(data: InvoiceData) {
  const primary = data.description || data.category || 'Sales / Services'
  const secondary =
    data.description && data.category && data.description !== data.category
      ? `Category: ${data.category}`
      : data.category && !data.description
        ? `Category: ${data.category}`
        : ''

  return secondary ? `${primary}\n${secondary}` : primary
}

function getTableBody(data: InvoiceData) {
  return [[
    buildLineItemDescription(data),
    formatDate(data.transactionDate, formatDate(data.createdAt)),
    '1.00',
    fmt(data.amount),
    fmt(data.amount),
  ]]
}

function getBusinessName(data: InvoiceData) {
  return data.businessProfile?.business_name || 'FintraBooks'
}

function getBusinessLines(doc: jsPDF, data: InvoiceData, width: number) {
  const lines: string[] = []

  if (data.businessProfile?.business_address) {
    lines.push(
      ...doc.splitTextToSize(data.businessProfile.business_address.replace(/\n/g, ', '), width)
    )
  }

  if (data.businessProfile?.business_contact) {
    lines.push(data.businessProfile.business_contact)
  }

  if (data.businessProfile?.business_email) {
    lines.push(data.businessProfile.business_email)
  }

  if (lines.length === 0) {
    lines.push('AI-powered accounting for modern businesses')
  }

  return lines
}

function drawStatusPill(doc: jsPDF, status: InvoiceStatus, x: number, y: number, align: 'left' | 'right' = 'left') {
  const palette = getStatusColors(status)
  const label = status.toUpperCase()
  const width = doc.getTextWidth(label) + 12
  const startX = align === 'right' ? x - width : x

  doc.setFillColor(...palette.bg)
  doc.roundedRect(startX, y - 5, width, 10, 3, 3, 'F')
  doc.setTextColor(...palette.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(label, startX + width / 2, y + 1.5, { align: 'center' })
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  accent: RGBColor
) {
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(x, y, w, 22, 4, 4, 'F')
  doc.setFillColor(...accent)
  doc.roundedRect(x, y, 5, 22, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(label.toUpperCase(), x + 9, y + 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(value, x + 9, y + 16)
}

function getFinalY(doc: AutoTableDoc, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback
}

export function generateInvoicePDF(data: InvoiceData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const style = data.templateStyle || 'modern'

  if (style === 'minimal') {
    renderMinimal(doc, data)
  } else if (style === 'bold') {
    renderBold(doc, data)
  } else {
    renderModern(doc, data)
  }

  doc.save(`Invoice_${data.invoiceNumber}_${data.customerName.replace(/\s+/g, '_')}.pdf`)
}

function renderModern(doc: jsPDF, data: InvoiceData) {
  const pdf = doc as AutoTableDoc
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const status = getStatus(data.status)
  const statusColors = getStatusColors(status)
  const businessName = getBusinessName(data)
  const invoiceDate = formatDate(data.createdAt)
  const dueDate = formatDate(data.dueDate)
  const tableBody = getTableBody(data)
  const businessLines = getBusinessLines(doc, data, 78)

  const slate = [15, 23, 42] as RGBColor
  const emerald = [16, 185, 129] as RGBColor
  const paper = [245, 247, 250] as RGBColor
  const white = [255, 255, 255] as RGBColor
  const border = [226, 232, 240] as RGBColor
  const darkText = [15, 23, 42] as RGBColor
  const mutedText = [100, 116, 139] as RGBColor

  doc.setFillColor(...paper)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  doc.setFillColor(...slate)
  doc.roundedRect(12, 12, pageWidth - 24, 50, 6, 6, 'F')
  doc.setFillColor(...emerald)
  doc.roundedRect(pageWidth - 52, 16, 28, 4, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...white)
  doc.text(businessName, 20, 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  doc.text('Professional invoice', 20, 35)
  doc.text(businessLines, 20, 43)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...white)
  doc.text('INVOICE', pageWidth - 20, 27, { align: 'right' })

  doc.setFontSize(12)
  doc.setTextColor(148, 163, 184)
  doc.text(data.invoiceNumber, pageWidth - 20, 37, { align: 'right' })
  drawStatusPill(doc, status, pageWidth - 20, 50, 'right')

  doc.setFillColor(...white)
  doc.setDrawColor(...border)
  doc.roundedRect(12, 72, pageWidth - 24, pageHeight - 92, 6, 6, 'FD')

  const cardY = 82
  const cardGap = 6
  const cardWidth = (pageWidth - 40 - cardGap * 2) / 3
  drawMetricCard(doc, 20, cardY, cardWidth, 'Issued', invoiceDate, [59, 130, 246])
  drawMetricCard(doc, 20 + cardWidth + cardGap, cardY, cardWidth, 'Due', dueDate, [245, 158, 11])
  drawMetricCard(doc, 20 + (cardWidth + cardGap) * 2, cardY, cardWidth, 'Total Due', fmt(data.totalAmount), emerald)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...mutedText)
  doc.text('BILLED FROM', 20, 118)
  doc.text('BILLED TO', pageWidth / 2 + 5, 118)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...darkText)
  doc.text(businessName, 20, 126)
  doc.text(data.customerName, pageWidth / 2 + 5, 126)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...mutedText)
  doc.text(businessLines, 20, 133)

  const customerLines = [
    `Invoice No: ${data.invoiceNumber}`,
    `Status: ${status.toUpperCase()}`,
    `Due: ${dueDate}`,
  ]
  doc.text(customerLines, pageWidth / 2 + 5, 133)

  autoTable(doc, {
    startY: 150,
    head: [['DESCRIPTION', 'SERVICE DATE', 'QTY', 'RATE', 'AMOUNT']],
    body: tableBody,
    theme: 'plain',
    margin: { left: 20, right: 20 },
    headStyles: {
      fillColor: slate,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 6,
    },
    bodyStyles: {
      textColor: darkText,
      fontSize: 10,
      cellPadding: 8,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 34 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 34 },
    },
  })

  const finalY = getFinalY(pdf, 184)
  const notesX = 20
  const notesY = finalY + 12
  const notesW = 92
  const totalsX = pageWidth - 88
  const totalsY = finalY + 8

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(notesX, notesY, notesW, 42, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...darkText)
  doc.text('Notes & Terms', notesX + 6, notesY + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedText)
  const notesText =
    data.notes ||
    'Thank you for your business. Please make payment by the due date and include the invoice number in your reference.'
  doc.text(doc.splitTextToSize(notesText, notesW - 12), notesX + 6, notesY + 16)

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(totalsX, totalsY, 68, 46, 4, 4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...mutedText)
  doc.text('Subtotal', totalsX + 6, totalsY + 11)
  doc.text(fmt(data.amount), totalsX + 62, totalsY + 11, { align: 'right' })
  doc.text(`Tax (${data.taxRate}%)`, totalsX + 6, totalsY + 20)
  doc.text(fmt(data.taxAmount), totalsX + 62, totalsY + 20, { align: 'right' })

  doc.setDrawColor(...border)
  doc.line(totalsX + 6, totalsY + 25, totalsX + 62, totalsY + 25)

  doc.setFillColor(...emerald)
  doc.roundedRect(totalsX + 4, totalsY + 29, 60, 12, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...white)
  doc.text('TOTAL DUE', totalsX + 10, totalsY + 37)
  doc.text(fmt(data.totalAmount), totalsX + 58, totalsY + 37, { align: 'right' })

  doc.setFillColor(...statusColors.bg)
  doc.roundedRect(20, pageHeight - 28, 34, 10, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...statusColors.text)
  doc.text(status.toUpperCase(), 37, pageHeight - 21.5, { align: 'center' })

  doc.setDrawColor(...border)
  doc.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...mutedText)
  doc.text('Generated securely via FintraBooks AI Accounting', 20, pageHeight - 11)
  doc.text('Thank you for your business', pageWidth - 20, pageHeight - 11, { align: 'right' })
}

function renderMinimal(doc: jsPDF, data: InvoiceData) {
  const pdf = doc as AutoTableDoc
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const status = getStatus(data.status)
  const businessName = getBusinessName(data)
  const invoiceDate = formatDate(data.createdAt)
  const dueDate = formatDate(data.dueDate)
  const businessLines = getBusinessLines(doc, data, 65)

  const darkText = [17, 24, 39] as RGBColor
  const mutedText = [107, 114, 128] as RGBColor
  const border = [226, 232, 240] as RGBColor

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...darkText)
  doc.text(businessName, 20, 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...mutedText)
  doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...darkText)
  doc.text(data.invoiceNumber, pageWidth - 20, 28, { align: 'right' })
  drawStatusPill(doc, status, pageWidth - 20, 37, 'right')

  doc.setDrawColor(...border)
  doc.line(20, 42, pageWidth - 20, 42)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...mutedText)
  doc.text('FROM', 20, 56)
  doc.text('BILLED TO', 90, 56)
  doc.text('DATES', pageWidth - 42, 56, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...darkText)
  doc.text(businessName, 20, 64)
  doc.text(data.customerName, 90, 64)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...mutedText)
  doc.text(businessLines, 20, 71)
  doc.text([`Issued: ${invoiceDate}`, `Due: ${dueDate}`], pageWidth - 20, 64, { align: 'right' })

  autoTable(doc, {
    startY: 98,
    head: [['Item Description', 'Date', 'Qty', 'Rate', 'Amount']],
    body: getTableBody(data),
    theme: 'plain',
    margin: { left: 20, right: 20 },
    headStyles: {
      textColor: mutedText,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 5, bottom: 5 },
    },
    bodyStyles: {
      textColor: darkText,
      fontSize: 10,
      cellPadding: { top: 8, bottom: 8 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
    },
    didDrawCell: (hookData) => {
      if (hookData.row.section === 'head' || hookData.row.index === 0) {
        doc.setDrawColor(...border)
        doc.setLineWidth(0.2)
        doc.line(
          hookData.cell.x,
          hookData.cell.y + hookData.cell.height,
          hookData.cell.x + hookData.cell.width,
          hookData.cell.y + hookData.cell.height
        )
      }
    },
  })

  const finalY = getFinalY(pdf, 132)
  const totalsX = pageWidth - 78

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...mutedText)
  doc.text('Subtotal', totalsX, finalY + 16)
  doc.text(fmt(data.amount), pageWidth - 20, finalY + 16, { align: 'right' })
  doc.text(`Tax (${data.taxRate}%)`, totalsX, finalY + 24)
  doc.text(fmt(data.taxAmount), pageWidth - 20, finalY + 24, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...darkText)
  doc.text('Total Due', totalsX, finalY + 36)
  doc.text(fmt(data.totalAmount), pageWidth - 20, finalY + 36, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedText)
  const noteText = data.notes || 'Thank you for your business.'
  doc.text(doc.splitTextToSize(noteText, 90), 20, finalY + 16)

  doc.setDrawColor(...border)
  doc.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18)
  doc.setFontSize(8)
  doc.text('Generated by FintraBooks', pageWidth / 2, pageHeight - 11, { align: 'center' })
}

function renderBold(doc: jsPDF, data: InvoiceData) {
  const pdf = doc as AutoTableDoc
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const status = getStatus(data.status)
  const invoiceDate = formatDate(data.createdAt)
  const dueDate = formatDate(data.dueDate)
  const businessName = getBusinessName(data)
  const businessLines = getBusinessLines(doc, data, 42)
  const statusColors = getStatusColors(status)

  const darkBg = [15, 23, 42] as RGBColor
  const darkText = [15, 23, 42] as RGBColor
  const mutedText = [100, 116, 139] as RGBColor
  const white = [255, 255, 255] as RGBColor
  const emerald = [16, 185, 129] as RGBColor

  const sidebarWidth = 64

  doc.setFillColor(...darkBg)
  doc.rect(0, 0, sidebarWidth, pageHeight, 'F')
  doc.setFillColor(...emerald)
  doc.rect(0, 0, sidebarWidth, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...white)
  doc.text(doc.splitTextToSize(businessName.toUpperCase(), sidebarWidth - 16), 8, 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184)
  doc.text(businessLines, 8, 52)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...white)
  doc.text('INVOICE NO.', 8, 104)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(data.invoiceNumber, 8, 111)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...white)
  doc.text('ISSUED', 8, 126)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(invoiceDate, 8, 133)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...white)
  doc.text('DUE', 8, 148)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(dueDate, 8, 155)

  const contentX = sidebarWidth + 12
  doc.setFillColor(248, 250, 252)
  doc.rect(sidebarWidth, 0, pageWidth - sidebarWidth, pageHeight, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(...darkText)
  doc.text('INVOICE', contentX, 28)
  drawStatusPill(doc, status, pageWidth - 20, 28, 'right')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...mutedText)
  doc.text('BILLED TO', contentX, 48)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...darkText)
  doc.text(data.customerName, contentX, 57)

  autoTable(doc, {
    startY: 74,
    head: [['DESCRIPTION', 'DATE', 'QTY', 'RATE', 'AMOUNT']],
    body: getTableBody(data),
    theme: 'plain',
    margin: { left: contentX, right: 16 },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 8,
    },
    bodyStyles: {
      textColor: darkText,
      fontSize: 10,
      cellPadding: 10,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
  })

  const finalY = getFinalY(pdf, 112)
  const totalsX = pageWidth - 84

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...mutedText)
  doc.text('Subtotal', totalsX, finalY + 14)
  doc.text(fmt(data.amount), pageWidth - 18, finalY + 14, { align: 'right' })
  doc.text(`Tax (${data.taxRate}%)`, totalsX, finalY + 22)
  doc.text(fmt(data.taxAmount), pageWidth - 18, finalY + 22, { align: 'right' })

  doc.setFillColor(...emerald)
  doc.roundedRect(totalsX - 4, finalY + 28, 62, 14, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...white)
  doc.text('TOTAL', totalsX + 2, finalY + 37)
  doc.text(fmt(data.totalAmount), pageWidth - 22, finalY + 37, { align: 'right' })

  doc.setFillColor(...statusColors.bg)
  doc.roundedRect(contentX, finalY + 28, 34, 12, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...statusColors.text)
  doc.text(status.toUpperCase(), contentX + 17, finalY + 35.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedText)
  const notesText = data.notes || 'Thank you for your business.'
  doc.text(doc.splitTextToSize(notesText, 78), contentX, finalY + 52)
}
