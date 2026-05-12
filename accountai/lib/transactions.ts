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
  bill_number: string | null
  gst_amount: number | null
  total_with_gst: number | null
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
  bill_number?: string | null
  gst_amount?: number | null
  total_with_gst?: number | null
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

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as Transaction[]
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
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []).reverse()
}

export async function clearChatHistory(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)
}

// ── Products ──────────────────────────────────────────────

export interface Product {
  id: string
  user_id: string
  name: string
  hsn_code: string | null
  unit: string
  unit_price: number
  gst_rate: number
  created_at: string
}

export async function getProducts(userId: string): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) return []
  return (data ?? []) as Product[]
}

export async function findOrCreateProduct(
  userId: string,
  name: string,
  defaults?: { hsn_code?: string; unit?: string; unit_price?: number; gst_rate?: number }
): Promise<Product | null> {
  const supabase = await createClient()
  const normalizedName = name.trim()

  // Try existing
  const { data: existing } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', normalizedName)
    .limit(1)
    .single()

  if (existing) return existing as Product

  // Create new
  const { data: created, error } = await supabase
    .from('products')
    .insert({
      user_id: userId,
      name: normalizedName,
      hsn_code: defaults?.hsn_code ?? null,
      unit: defaults?.unit ?? 'pcs',
      unit_price: defaults?.unit_price ?? 0,
      gst_rate: defaults?.gst_rate ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('findOrCreateProduct error:', error)
    return null
  }
  return created as Product
}

// ── Transaction Items (line items) ────────────────────────

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string | null
  item_name: string
  hsn_code: string | null
  quantity: number
  unit: string
  rate: number
  discount_pct: number
  gst_rate: number
  amount: number
  gst_amount: number
  total: number
  created_at: string
}

export type TransactionItemInput = {
  item_name: string
  hsn_code?: string | null
  quantity: number
  unit?: string
  rate: number
  discount_pct?: number
  gst_rate?: number
}

function computeItemTotals(item: TransactionItemInput) {
  const quantity = item.quantity
  const rate = item.rate
  const discountPct = item.discount_pct ?? 0
  const gstRate = item.gst_rate ?? 0

  const lineTotal = quantity * rate
  const discountAmount = lineTotal * (discountPct / 100)
  const amount = Math.round((lineTotal - discountAmount) * 100) / 100
  const gstAmount = Math.round(amount * (gstRate / 100) * 100) / 100
  const total = Math.round((amount + gstAmount) * 100) / 100

  return { amount, gst_amount: gstAmount, total }
}

export async function getTransactionItems(
  transactionId: string
): Promise<TransactionItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at')

  if (error) return []
  return (data ?? []) as TransactionItem[]
}

export async function addTransactionItem(
  transactionId: string,
  item: TransactionItemInput
): Promise<TransactionItem | null> {
  const supabase = await createClient()
  const computed = computeItemTotals(item)

  const { data, error } = await supabase
    .from('transaction_items')
    .insert({
      transaction_id: transactionId,
      item_name: item.item_name,
      hsn_code: item.hsn_code ?? null,
      quantity: item.quantity,
      unit: item.unit ?? 'pcs',
      rate: item.rate,
      discount_pct: item.discount_pct ?? 0,
      gst_rate: item.gst_rate ?? 0,
      amount: computed.amount,
      gst_amount: computed.gst_amount,
      total: computed.total,
    })
    .select()
    .single()

  if (error) {
    console.error('addTransactionItem error:', error)
    return null
  }
  return data as TransactionItem
}

export async function deleteTransactionItem(
  itemId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transaction_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('deleteTransactionItem error:', error)
    return false
  }
  return true
}

/** Recalculate and update the parent transaction's amount/gst from its items */
export async function syncTransactionFromItems(
  userId: string,
  transactionId: string
): Promise<Transaction | null> {
  const items = await getTransactionItems(transactionId)
  if (items.length === 0) return null

  const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0)
  const totalGst = items.reduce((s, i) => s + Number(i.gst_amount), 0)
  const totalWithGst = items.reduce((s, i) => s + Number(i.total), 0)

  return updateTransaction(userId, transactionId, {
    amount: Math.round(totalAmount * 100) / 100,
    gst_amount: Math.round(totalGst * 100) / 100,
    total_with_gst: Math.round(totalWithGst * 100) / 100,
  })
}

// ── Payments ──────────────────────────────────────────────

export interface Payment {
  id: string
  user_id: string
  transaction_id: string
  amount: number
  payment_mode: 'cash' | 'upi' | 'bank' | 'cheque' | 'other'
  reference: string | null
  payment_date: string
  notes: string | null
  created_at: string
}

export type PaymentInput = {
  transaction_id: string
  amount: number
  payment_mode?: 'cash' | 'upi' | 'bank' | 'cheque' | 'other'
  reference?: string | null
  payment_date?: string
  notes?: string | null
}

export async function getPayments(
  transactionId: string
): Promise<Payment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('payment_date', { ascending: false })

  if (error) return []
  return (data ?? []) as Payment[]
}

/**
 * Record a payment against a transaction and auto-update its payment_status.
 * Returns the created payment row.
 */
export async function addPayment(
  userId: string,
  input: PaymentInput
): Promise<Payment | null> {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      transaction_id: input.transaction_id,
      amount: input.amount,
      payment_mode: input.payment_mode ?? 'cash',
      reference: input.reference ?? null,
      payment_date: input.payment_date ?? new Date().toISOString().split('T')[0],
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('addPayment error:', error)
    return null
  }

  // Auto-update transaction paid_amount and payment_status
  await syncPaymentStatus(userId, input.transaction_id)

  return payment as Payment
}

/** Recalculate paid_amount and payment_status from all payments */
export async function syncPaymentStatus(
  userId: string,
  transactionId: string
): Promise<void> {
  const supabase = await createClient()

  // Get transaction total
  const { data: tx } = await supabase
    .from('transactions')
    .select('amount, total_with_gst')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single()

  if (!tx) return

  const transactionTotal = Number(tx.total_with_gst ?? tx.amount)

  // Sum all payments
  const payments = await getPayments(transactionId)
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)

  let status: 'paid' | 'unpaid' | 'partial' = 'unpaid'
  if (totalPaid >= transactionTotal) {
    status = 'paid'
  } else if (totalPaid > 0) {
    status = 'partial'
  }

  await supabase
    .from('transactions')
    .update({
      paid_amount: Math.round(totalPaid * 100) / 100,
      payment_status: status,
    })
    .eq('id', transactionId)
    .eq('user_id', userId)
}
