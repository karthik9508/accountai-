'use server'

import { createClient } from '@/lib/supabase/server'
import { updateTransaction } from '@/lib/transactions'
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
    date?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const result = await updateTransaction(user.id, transactionId, updates)
  if (!result) return { error: 'Failed to update transaction' }

  revalidatePath('/reports')
  return { success: true, transaction: result }
}

export async function deleteTransactionAction(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to delete transaction' }

  revalidatePath('/reports')
  return { success: true }
}
