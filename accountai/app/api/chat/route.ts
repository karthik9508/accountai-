import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseUserMessage } from '@/lib/gemini'
import { extractTextFromImage } from '@/lib/vision'
import {
  insertTransaction,
  saveChatMessage,
  getChatHistory,
  getBalance,
  getMonthlySummary,
  getCategoryBreakdown,
  updateTransactionAmount,
  updateTransaction,
  type ChatMessage,
} from '@/lib/transactions'
import {
  getCustomerStatement,
  getCustomerOutstanding,
  getInvoiceByNumber,
  updateInvoice,
  deleteInvoice,
  getInvoicesByCustomer,
} from '@/lib/invoices'

function buildConversationContext(messages: ChatMessage[]): string {
  return messages
    .slice(-10)
    .map((message) => {
      const metadata = message.metadata ?? {}
      const intent =
        typeof metadata.intent === 'string' && metadata.intent.length > 0
          ? ` | intent=${metadata.intent}`
          : ''

      return `${message.role.toUpperCase()}: ${message.content}${intent}`
    })
    .join('\n')
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, imageBase64, mimeType } = await req.json()

    const finalMessage = message?.trim() || (imageBase64 ? 'Please extract the transaction details from this document.' : '')

    if (!finalMessage) {
      return NextResponse.json({ error: 'Message or document is required' }, { status: 400 })
    }

    const recentMessages = await getChatHistory(user.id, 10)

    // 2. Process image: OCR for text extraction + Gemini multimodal for understanding
    let promptForAI = finalMessage
    let extractedText: string | null = null
    if (imageBase64) {
      try {
        extractedText = await extractTextFromImage(imageBase64)
        if (extractedText && extractedText.trim().length > 0) {
          console.log('OCR Extracted successfully, length:', extractedText.length)
          promptForAI += `\n\n--- Document Text (OCR) ---\n${extractedText}\n--------------------------`
        }
      } catch (err) {
        // OCR failed — continue with Gemini multimodal only (it can still read the image)
        console.warn('Vision OCR failed, falling back to Gemini multimodal:', err instanceof Error ? err.message : err)
      }
    }

    await saveChatMessage(user.id, 'user', finalMessage, {
      hasAttachment: Boolean(imageBase64),
      imageBase64: imageBase64 ?? null,
      mimeType: mimeType ?? null,
      extractedText,
      originalMessage: message ?? '',
    })

    // 3. Parse with Gemini AI using recent conversation context
    const conversationContext = buildConversationContext(recentMessages)
    const aiResult = await parseUserMessage(promptForAI, conversationContext)

    let finalReply = aiResult.reply
    let transactionData = null
    let pendingTransaction = null
    let statementData = null
    let outstandingData = null
    let invoiceData = null

    // 4. Act on intent
    if (aiResult.intent === 'record_transaction' && aiResult.transaction) {
      // Don't save yet — return as pending for user confirmation
      pendingTransaction = {
        amount: aiResult.transaction.amount,
        type: aiResult.transaction.type,
        category: aiResult.transaction.category,
        description: aiResult.transaction.description,
        date: aiResult.transaction.date,
        customer_name: aiResult.transaction.customer_name ?? null,
        payment_status: aiResult.transaction.payment_status ?? 'paid',
        paid_amount: aiResult.transaction.paid_amount ?? null,
      }
      finalReply = `I parsed this transaction — please review and confirm:\n\n${aiResult.reply}`
    }

    else if (aiResult.intent === 'query_balance') {
      const balance = await getBalance(user.id)
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Math.abs(balance))

      finalReply = balance >= 0
        ? `Your current balance is **${formatted}** (surplus) 📈`
        : `Your current balance is **-${formatted}** (deficit) 📉`
    }

    else if (aiResult.intent === 'query_report') {
      const summary = await getMonthlySummary(user.id)
      const breakdown = await getCategoryBreakdown(user.id, 'expense', 3)
      const fmt = (n: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

      const topCategories = breakdown.length > 0
        ? breakdown.map((c) => `${c.category} (${fmt(c.total)})`).join(', ')
        : 'No expenses yet'

      finalReply = `**This month's summary:**\n💰 Income: ${fmt(summary.totalIncome)}\n💸 Expenses: ${fmt(summary.totalExpenses)}\n📊 Balance: ${fmt(summary.balance)}\n\nTop categories: ${topCategories}`
    }

    else if (aiResult.intent === 'query_customer_statement') {
      const customerName = aiResult.customer_name
      if (!customerName) {
        finalReply = '❓ Please specify a customer name. Example: "show statement for Ravi"'
      } else {
        const statement = await getCustomerStatement(user.id, customerName)
        statementData = statement

        if (statement.transactions.length === 0 && statement.invoices.length === 0) {
          finalReply = `📋 No transactions or invoices found for **${customerName}**.`
        } else {
          const fmt = (n: number) =>
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

          let reply = `📋 **Statement for ${customerName}:**\n\n`
          reply += `💰 Total Sales: ${fmt(statement.totalSales)}\n`
          reply += `✅ Total Paid: ${fmt(statement.totalPaid)}\n`
          reply += `⏳ Outstanding: ${fmt(statement.totalOutstanding)}\n\n`

          if (statement.transactions.length > 0) {
            reply += `**Recent Transactions (${statement.transactions.length}):**\n`
            statement.transactions.slice(0, 5).forEach((t) => {
              const sign = t.type === 'income' ? '+' : '-'
              reply += `${sign}${fmt(t.amount)} · ${t.category} · ${t.date}\n`
            })
          }

          if (statement.invoices.length > 0) {
            reply += `\n**Invoices (${statement.invoices.length}):**\n`
            statement.invoices.slice(0, 5).forEach((inv) => {
              const statusIcon = inv.status === 'paid' ? '✅' : inv.status === 'partial' ? '🔶' : '🔴'
              reply += `${statusIcon} ${inv.invoiceNumber} · ${fmt(inv.totalAmount)} · ${inv.status}\n`
            })
          }

          finalReply = reply
        }
      }
    }

    else if (aiResult.intent === 'query_outstanding') {
      const customerName = aiResult.customer_name
      if (!customerName) {
        finalReply = '❓ Please specify a customer name. Example: "outstanding for Ravi"'
      } else {
        const result = await getCustomerOutstanding(user.id, customerName)
        outstandingData = result

        const fmt = (n: number) =>
          new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

        if (result.outstanding === 0 && result.unpaidInvoices === 0) {
          finalReply = `✅ **${customerName}** has no outstanding dues! All clear. 🎉`
        } else {
          finalReply = `⏳ **Outstanding for ${customerName}:**\n\n💰 Amount Due: **${fmt(result.outstanding)}**\n📄 Unpaid Invoices: **${result.unpaidInvoices}**\n\nSay "show statement for ${customerName}" for full details.`
        }
      }
    }

    else if (aiResult.intent === 'manage_invoice' && aiResult.invoice_action) {
      const action = aiResult.invoice_action
      const invNumber = action.invoice_number

      if (!invNumber) {
        finalReply = '❓ Please specify an invoice number. Example: "show invoice INV-001"'
      } else {
        if (action.action === 'get') {
          const invoice = await getInvoiceByNumber(user.id, invNumber)
          if (!invoice) {
            finalReply = `❌ Could not find invoice **${invNumber}**.`
          } else {
            invoiceData = invoice
            finalReply = `Here is invoice **${invNumber}**:`
          }
        } 
        else if (action.action === 'edit') {
          if (!action.updates) {
            finalReply = `❓ What would you like to update on **${invNumber}**?`
          } else {
            const updated = await updateInvoice(user.id, invNumber, action.updates)
            if (!updated) {
              finalReply = `❌ Failed to update invoice **${invNumber}**. Make sure it exists.`
            } else {
              // Update underlying transaction if amount changed
              if (action.updates.amount && updated.transaction_id) {
                await updateTransactionAmount(user.id, updated.transaction_id, action.updates.amount)
              }
              invoiceData = updated
              finalReply = `✅ Invoice **${invNumber}** has been updated successfully.`
            }
          }
        }
        else if (action.action === 'delete') {
          const existing = await getInvoiceByNumber(user.id, invNumber)
          if (!existing) {
            finalReply = `❌ Could not find invoice **${invNumber}**.`
          } else {
            const success = await deleteInvoice(user.id, existing.id)
            if (success) {
              finalReply = `🗑️ Invoice **${invNumber}** has been deleted successfully. (The underlying transaction was kept).`
            } else {
              finalReply = `❌ Failed to delete invoice **${invNumber}**.`
            }
          }
        }
      }
    }

    // ── Payment received against customer invoices ──
    else if (aiResult.intent === 'payment_received') {
      const customerName = aiResult.customer_name
      const paymentAmount = aiResult.transaction?.amount

      if (!customerName || !paymentAmount) {
        finalReply = '❓ Please specify both the customer name and amount. Example: "received ₹5000 from Ravi"'
      } else {
        // Record the payment as an income transaction
        const tx = await insertTransaction(user.id, {
          amount: paymentAmount,
          type: 'income',
          category: 'Sales',
          description: `Payment received from ${customerName}`,
          date: aiResult.transaction?.date || new Date().toISOString().split('T')[0],
          customer_name: customerName,
          payment_status: 'paid',
        })

        // Try to mark oldest unpaid invoices as paid
        const invoices = await getInvoicesByCustomer(user.id, customerName)
        const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid').sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        let remaining = paymentAmount
        let invoicesUpdated = 0

        for (const inv of unpaidInvoices) {
          if (remaining <= 0) break

          if (remaining >= Number(inv.total_amount)) {
            await updateInvoice(user.id, inv.invoice_number, { status: 'paid' })
            remaining -= Number(inv.total_amount)
            invoicesUpdated++
          } else {
            await updateInvoice(user.id, inv.invoice_number, { status: 'partial' })
            remaining = 0
            invoicesUpdated++
          }
        }

        const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

        if (tx) {
          transactionData = tx
          finalReply = `✅ Payment of **${fmt(paymentAmount)}** from **${customerName}** recorded!`
          if (invoicesUpdated > 0) {
            finalReply += ` ${invoicesUpdated} invoice(s) updated automatically. 📄`
          }
        } else {
          finalReply = `❌ Failed to record payment. Please try again.`
        }
      }
    }

    // ── Update existing transaction (sales update, return, etc.) ──
    else if (aiResult.intent === 'update_transaction') {
      const customerName = aiResult.customer_name
      const updateData = aiResult.transaction

      if (!customerName) {
        finalReply = '❓ Please specify which customer\'s transaction to update.'
      } else if (!updateData) {
        finalReply = '❓ Please specify what to update. Example: "update Ravi sale to 8000" or "return from Ravi 2000"'
      } else {
        // Find the most recent matching transaction for this customer
        const supabaseClient = await createClient()
        const { data: recentTx } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .ilike('customer_name', `%${customerName.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!recentTx) {
          finalReply = `❌ No transaction found for **${customerName}**. Please check the name.`
        } else {
          const updates: {
            amount?: number
            payment_status?: 'paid' | 'unpaid' | 'partial'
            paid_amount?: number | null
            description?: string
          } = {}
          if (updateData.amount) updates.amount = updateData.amount
          if (updateData.payment_status) updates.payment_status = updateData.payment_status
          if (updateData.paid_amount !== undefined) updates.paid_amount = updateData.paid_amount
          if (updateData.description) updates.description = updateData.description

          const updated = await updateTransaction(user.id, recentTx.id, updates)
          const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

          if (updated) {
            transactionData = updated
            finalReply = `✅ Transaction for **${customerName}** updated to **${fmt(updated.amount)}** (${updated.payment_status}). 📝`
          } else {
            finalReply = `❌ Failed to update transaction for **${customerName}**.`
          }
        }
      }
    }

    // 5. Save assistant reply to DB
    await saveChatMessage(user.id, 'assistant', finalReply, {
      intent: aiResult.intent,
      aiResult,
      conversationContextUsed: Boolean(conversationContext),
      transaction: transactionData,
      pendingTransaction,
      statementData,
      outstandingData,
      invoiceData,
    })

    // 6. Return response
    return NextResponse.json({
      reply: finalReply,
      intent: aiResult.intent,
      transaction: transactionData,
      pendingTransaction,
      statementData,
      outstandingData,
      invoiceData,
    })
  } catch (error: unknown) {
    console.error('Chat API error:', error)

    // Handle Gemini rate limit (429) gracefully
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota')) {
      return NextResponse.json(
        { error: 'AI is rate-limited. Please wait 30 seconds and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
