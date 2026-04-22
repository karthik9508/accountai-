import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvoice } from '@/lib/invoices'
import { saveChatMessage } from '@/lib/transactions'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, customerName, amount, taxRate, dueDate, notes } = await req.json()

    if (!transactionId || !customerName || !amount) {
      return NextResponse.json(
        { error: 'transactionId, customerName, and amount are required.' },
        { status: 400 }
      )
    }

    const invoice = await createInvoice(user.id, {
      transactionId,
      customerName,
      amount: Number(amount),
      taxRate: taxRate ? Number(taxRate) : 0,
      dueDate,
      notes,
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Failed to create invoice.' },
        { status: 500 }
      )
    }

    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n)

    const reply = `📄 Invoice **${invoice.invoice_number}** generated!\n\nCustomer: **${customerName}**\nAmount: ${fmt(invoice.amount)}\nTax: ${fmt(invoice.tax_amount)}\nTotal: **${fmt(invoice.total_amount)}**\nDue: ${invoice.due_date}\nStatus: Unpaid`

    await saveChatMessage(user.id, 'assistant', reply, {
      intent: 'invoice_generated',
      invoiceData: { ...invoice, customer_name: customerName },
    })

    return NextResponse.json({
      success: true,
      invoice: { ...invoice, customer_name: customerName },
      reply,
    })
  } catch (error) {
    console.error('Invoice API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong creating the invoice.' },
      { status: 500 }
    )
  }
}
