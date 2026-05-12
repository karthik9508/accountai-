'use server'

import { createClient } from '@/lib/supabase/server'
import {
  updateTransaction,
  addTransactionItem,
  deleteTransactionItem,
  syncTransactionFromItems,
  addPayment,
  getTransactionItems,
  getPayments,
  type TransactionItemInput,
} from '@/lib/transactions'
import { revalidatePath } from 'next/cache'

export async function updateTransactionAction(
  transactionId: string,
  updates: {
    amount?: number
    type?: 'income' | 'expense'
    category?: string
    description?: string | null
    customer_name?: string | null
    payment_status?: 'paid' | 'unpaid' | 'partial'
    paid_amount?: number | null
    bill_number?: string | null
    date?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const result = await updateTransaction(user.id, transactionId, updates)
  if (!result) return { error: 'Failed to update transaction' }

  revalidatePath('/transactions')
  revalidatePath('/reports')
  return { success: true, transaction: result }
}

export async function deleteTransactionAction(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // First, delete any invoices linked to this transaction (FK constraint)
  const { error: invoiceError } = await supabase
    .from('invoices')
    .delete()
    .eq('transaction_id', transactionId)
    .eq('user_id', user.id)

  if (invoiceError) {
    console.error('Failed to delete linked invoices:', invoiceError)
    return { error: 'Failed to delete linked invoices' }
  }

  // Now delete the transaction itself
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete transaction:', error)
    return { error: 'Failed to delete transaction' }
  }

  revalidatePath('/transactions')
  revalidatePath('/reports')
  return { success: true }
}

// ── Line Items ────────────────────────────────────────────

export async function addItemAction(
  transactionId: string,
  item: TransactionItemInput
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const created = await addTransactionItem(transactionId, item)
  if (!created) return { error: 'Failed to add item' }

  // Sync parent transaction totals from items
  await syncTransactionFromItems(user.id, transactionId)

  revalidatePath('/transactions')
  revalidatePath('/reports')
  return { success: true, item: created }
}

export async function deleteItemAction(transactionId: string, itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const deleted = await deleteTransactionItem(itemId)
  if (!deleted) return { error: 'Failed to delete item' }

  // Sync parent transaction totals from remaining items
  await syncTransactionFromItems(user.id, transactionId)

  revalidatePath('/transactions')
  revalidatePath('/reports')
  return { success: true }
}

// ── Payments ──────────────────────────────────────────────

export async function addPaymentAction(
  transactionId: string,
  input: {
    amount: number
    payment_mode?: 'cash' | 'upi' | 'bank' | 'cheque' | 'other'
    reference?: string | null
    payment_date?: string
    notes?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const payment = await addPayment(user.id, {
    transaction_id: transactionId,
    ...input,
  })
  if (!payment) return { error: 'Failed to record payment' }

  revalidatePath('/transactions')
  revalidatePath('/reports')
  return { success: true, payment }
}

// ── Fetch Details ─────────────────────────────────────────

export async function getTransactionDetailsAction(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const [items, payments] = await Promise.all([
    getTransactionItems(transactionId),
    getPayments(transactionId),
  ])

  return { success: true, items, payments }
}
