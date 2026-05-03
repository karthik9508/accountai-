import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertTransaction, saveChatMessage } from '@/lib/transactions'
import { findOrCreateCustomer } from '@/lib/invoices'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transaction, action } = await req.json()

    if (action === 'decline') {
      await saveChatMessage(user.id, 'user', 'Declined the pending transaction suggestion.', {
        intent: 'transaction_decline_request',
        transaction: transaction ?? null,
      })
      await saveChatMessage(user.id, 'assistant', 'Transaction discarded.', {
        intent: 'transaction_declined',
      })
      return NextResponse.json({ success: true, action: 'declined' })
    }

    if (action === 'accept' && transaction) {
      await saveChatMessage(user.id, 'user', 'Confirmed the pending transaction suggestion.', {
        intent: 'transaction_accept_request',
        transaction,
      })

      const saved = await insertTransaction(user.id, {
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        customer_name: transaction.customer_name ?? undefined,
        payment_status: transaction.payment_status ?? 'paid',
        paid_amount: transaction.paid_amount ?? null,
      })

      if (!saved) {
        return NextResponse.json(
          { error: 'Failed to save transaction.' },
          { status: 500 }
        )
      }

      if (transaction.customer_name) {
        await findOrCreateCustomer(user.id, transaction.customer_name)
      }

      const fmt = (n: number) =>
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(n)

      let confirmReply = `Transaction saved.\n${saved.type === 'income' ? '+' : '-'}${fmt(saved.amount)} · ${saved.category}`

      if ((saved.category === 'Sales' || saved.category === 'Purchase') && saved.payment_status) {
        confirmReply += `\nStatus: ${saved.payment_status}`
        if (saved.payment_status === 'partial' && saved.paid_amount != null) {
          confirmReply += ` (paid ${fmt(saved.paid_amount)})`
        }
      }

      const promptInvoice = saved.category === 'Sales' && !!transaction.customer_name

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
