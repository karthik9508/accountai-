import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface InvoiceData {
  invoiceNumber: string
  customerName: string
  amount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  dueDate: string | null
  notes: string | null
  createdAt: string
  // Transaction details
  description?: string
  category?: string
  transactionDate?: string
  // Business Details
  businessProfile?: {
    business_name?: string
    business_address?: string
    business_contact?: string
    business_email?: string
  }
}

const fmt = (n: number) =>
  'Rs. ' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n)

export function generateInvoicePDF(data: InvoiceData): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Colors ────────────────────────────────
  const emerald = [16, 185, 129] as const    // #10B981
  const darkBg = [8, 12, 10] as const        // #080C0A
  const gray600 = [75, 85, 99] as const
  const gray400 = [156, 163, 175] as const
  const white = [255, 255, 255] as const

  // ── Header band ───────────────────────────
  doc.setFillColor(...darkBg)
  doc.rect(0, 0, pageWidth, 50, 'F')

  // Accent stripe
  doc.setFillColor(...emerald)
  doc.rect(0, 50, pageWidth, 3, 'F')

  // Brand
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...white)
  const businessName = data.businessProfile?.business_name || 'FintraBooks'
  doc.text(businessName, 20, 25)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gray400)
  
  let addressY = 32
  if (data.businessProfile?.business_address) {
    doc.text(data.businessProfile.business_address.replace(/\n/g, ', '), 20, addressY)
    addressY += 5
  }
  
  const contactDetails = [data.businessProfile?.business_contact, data.businessProfile?.business_email].filter(Boolean).join('  |  ')
  if (contactDetails) {
    doc.text(contactDetails, 20, addressY)
  } else if (!data.businessProfile?.business_address && !businessName.includes('FintraBooks')) {
    // leave blank
  } else if (!data.businessProfile?.business_address) {
    doc.text('AI-Powered Accounting', 20, 33)
  }

  // INVOICE label (right-aligned)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...emerald)
  doc.text('INVOICE', pageWidth - 20, 28, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(...gray400)
  doc.text(data.invoiceNumber, pageWidth - 20, 38, { align: 'right' })

  // ── Info Section ──────────────────────────
  let y = 65

  // Left column: Bill To
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...gray600)
  doc.text('BILL TO', 20, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text(data.customerName, 20, y + 8)

  // Right column: Invoice details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...gray600)
  doc.text('INVOICE DATE', pageWidth - 70, y)
  doc.text('DUE DATE', pageWidth - 70, y + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  const invoiceDate = new Date(data.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.text(invoiceDate, pageWidth - 70, y + 6)

  const dueDate = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'On receipt'
  doc.text(dueDate, pageWidth - 70, y + 20)

  // ── Divider ───────────────────────────────
  y = 100
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.5)
  doc.line(20, y, pageWidth - 20, y)

  // ── Items Table ───────────────────────────
  y = 108

  const tableBody = [
    [
      data.description || data.category || 'Sales',
      data.transactionDate
        ? new Date(data.transactionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : invoiceDate,
      '1',
      fmt(data.amount),
      fmt(data.amount),
    ],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Date', 'Qty', 'Unit Price', 'Amount']],
    body: tableBody,
    theme: 'plain',
    margin: { left: 20, right: 20 },
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [75, 85, 99],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 6,
    },
    bodyStyles: {
      textColor: [30, 30, 30],
      fontSize: 10,
      cellPadding: 8,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 },
    },
    didDrawPage: () => {},
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  // ── Totals ────────────────────────────────
  const totalsX = pageWidth - 90
  const valuesX = pageWidth - 20

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...gray600)
  doc.text('Subtotal', totalsX, y)
  doc.setTextColor(30, 30, 30)
  doc.text(fmt(data.amount), valuesX, y, { align: 'right' })

  // Tax
  y += 10
  doc.setTextColor(...gray600)
  doc.text(`Tax (${data.taxRate}%)`, totalsX, y)
  doc.setTextColor(30, 30, 30)
  doc.text(fmt(data.taxAmount), valuesX, y, { align: 'right' })

  // Divider before total
  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX, y, valuesX, y)

  // Total
  y += 10
  doc.setFillColor(...emerald)
  doc.roundedRect(totalsX - 5, y - 6, valuesX - totalsX + 10, 16, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...white)
  doc.text('TOTAL', totalsX, y + 4)
  doc.text(fmt(data.totalAmount), valuesX, y + 4, { align: 'right' })

  // ── Status Badge ──────────────────────────
  y += 30
  doc.setFillColor(254, 243, 199) // amber-100
  doc.roundedRect(20, y - 4, 50, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(180, 83, 9) // amber-700
  doc.text('⏳ UNPAID', 25, y + 5)

  // ── Notes ─────────────────────────────────
  if (data.notes) {
    y += 25
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...gray600)
    doc.text('NOTES', 20, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(data.notes, pageWidth - 40)
    doc.text(lines, 20, y + 7)
  }

  // ── Footer ────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 25
  doc.setDrawColor(230, 230, 230)
  doc.line(20, footerY, pageWidth - 20, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Generated by FintraBooks · AI-Powered Accounting', pageWidth / 2, footerY + 8, { align: 'center' })
  doc.text('Thank you for your business!', pageWidth / 2, footerY + 14, { align: 'center' })

  // ── Save ──────────────────────────────────
  doc.save(`${data.invoiceNumber}_${data.customerName.replace(/\s+/g, '_')}.pdf`)
}
