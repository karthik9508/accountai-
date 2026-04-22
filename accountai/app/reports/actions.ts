'use server'

import { createClient } from '@/lib/supabase/server'
import { updateTransaction, Transaction } from '@/lib/transactions'
import { revalidatePath } from 'next/cache'

export async function editTransactionAction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const updated = await updateTransaction(user.id, transactionId, updates)

  if (!updated) {
    throw new Error('Failed to update transaction')
  }

  revalidatePath('/reports')
  return updated
}
