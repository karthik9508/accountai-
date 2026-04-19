import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertTransaction, saveChatMessage } from '@/lib/transactions'
import { findOrCreateCustomer } from '@/lib/invoices'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transaction, action } = await req.json()

    // action = 'accept' | 'decline'
    if (action === 'decline') {
      await saveChatMessage(user.id, 'assistant', '❌ Transaction discarded.', {
        intent: 'transaction_declined',
      })
      return NextResponse.json({ success: true, action: 'declined' })
    }

    if (action === 'accept' && transaction) {
      const saved = await insertTransaction(user.id, {
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        customer_name: transaction.customer_name ?? undefined,
      })

      if (!saved) {
        return NextResponse.json(
          { error: 'Failed to save transaction.' },
          { status: 500 }
        )
      }

      // Auto-create customer record if customer_name is present
      if (transaction.customer_name) {
        await findOrCreateCustomer(user.id, transaction.customer_name)
      }

      const fmt = (n: number) =>
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(n)

      const confirmReply = `✅ Transaction saved!\n${saved.type === 'income' ? '+' : '-'}${fmt(saved.amount)} · ${saved.category}`

      // Check if this is a Sales transaction with a customer → prompt invoice
      const isSales = saved.category === 'Sales' && !!transaction.customer_name
      const promptInvoice = isSales

      await saveChatMessage(user.id, 'assistant', confirmReply, {
        intent: 'transaction_confirmed',
        transaction: saved,
        promptInvoice,
      })

      return NextResponse.json({
        success: true,
        action: 'accepted',
        transaction: saved,
        reply: confirmReply,
        promptInvoice,
        customerName: transaction.customer_name ?? null,
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Confirm API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
