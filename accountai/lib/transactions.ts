import { createClient } from '@/lib/supabase/server'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string | null
  customer_name: string | null
  payment_status: 'paid' | 'unpaid' | 'partial'
  paid_amount: number | null
  date: string
  created_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface MonthlySummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
}

export interface CategoryBreakdown {
  category: string
  total: number
  count: number
  percentage: number
}

type TransactionWriteData = {
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
  customer_name?: string
  payment_status?: 'paid' | 'unpaid' | 'partial'
  paid_amount?: number | null
}

type TransactionUpdateData = Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>

function extractMissingColumn(error: { code?: string; message?: string } | null): string | null {
  if (!error || error.code !== 'PGRST204' || !error.message) {
    return null
  }

  const match = error.message.match(/'([^']+)' column/)
  return match?.[1] ?? null
}

function omitColumn<T extends Record<string, unknown>>(data: T, column: string): T {
  const cloned = { ...data }
  delete cloned[column]
  return cloned
}

async function insertTransactionWithFallback(
  userId: string,
  data: TransactionWriteData
): Promise<Transaction | null> {
  const supabase = await createClient()
  let payload: Record<string, unknown> = { user_id: userId, ...data }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()

    if (!error) {
      return row
    }

    const missingColumn = extractMissingColumn(error)
    if (!missingColumn || !(missingColumn in payload)) {
      console.error('insertTransaction error:', error)
      return null
    }

    console.warn(`insertTransaction fallback: retrying without unsupported column "${missingColumn}"`)
    payload = omitColumn(payload, missingColumn)
  }

  return null
}

async function updateTransactionWithFallback(
  userId: string,
  transactionId: string,
  updates: TransactionUpdateData
): Promise<Transaction | null> {
  const supabase = await createClient()
  let payload: Record<string, unknown> = { ...updates }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (!error) {
      return data
    }

    const missingColumn = extractMissingColumn(error)
    if (!missingColumn || !(missingColumn in payload)) {
      console.error('updateTransaction error:', error)
      return null
    }

    console.warn(`updateTransaction fallback: retrying without unsupported column "${missingColumn}"`)
    payload = omitColumn(payload, missingColumn)
  }

  return null
}

// ── Transactions ──────────────────────────────────────────

export async function insertTransaction(
  userId: string,
  data: TransactionWriteData
): Promise<Transaction | null> {
  return insertTransactionWithFallback(userId, data)
}
export async function updateTransactionAmount(
  userId: string,
  transactionId: string,
  amount: number
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ amount })
    .eq('id', transactionId)
    .eq('user_id', userId)

  if (error) {
    console.error('updateTransactionAmount error:', error)
    return false
  }
  return true
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: TransactionUpdateData
): Promise<Transaction | null> {
  return updateTransactionWithFallback(userId, transactionId, updates)
}


export async function getBalance(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)

  if (error || !data) return 0

  return data.reduce((acc, t) => {
    return t.type === 'income' ? acc + Number(t.amount) : acc - Number(t.amount)
  }, 0)
}

export async function getMonthlySummary(
  userId: string,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): Promise<MonthlySummary> {
  const supabase = await createClient()

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0] // last day of month

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)

  if (error || !data) {
    return { totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 }
  }

  const totalIncome = data
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalExpenses = data
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactionCount: data.length,
  }
}

export async function getCategoryBreakdown(
  userId: string,
  type: 'expense' | 'income' = 'expense',
  limit = 6
): Promise<CategoryBreakdown[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('user_id', userId)
    .eq('type', type)

  if (error || !data) return []

  const grouped: Record<string, { total: number; count: number }> = {}

  data.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = { total: 0, count: 0 }
    grouped[t.category].total += Number(t.amount)
    grouped[t.category].count += 1
  })

  const grandTotal = Object.values(grouped).reduce((s, g) => s + g.total, 0)

  return Object.entries(grouped)
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export async function getRecentTransactions(
  userId: string,
  limit = 10
): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}

// ── Chat messages ─────────────────────────────────────────

export async function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('chat_messages').insert({
    user_id: userId,
    role,
    content,
    metadata: metadata ?? null,
  })
}

export async function getChatHistory(
  userId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return []
  return data ?? []
}

export async function clearChatHistory(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)
}
