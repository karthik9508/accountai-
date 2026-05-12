import { createClient } from '@/lib/supabase/server'

export interface Customer {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  customer_id: string | null
  transaction_id: string | null
  invoice_number: string
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: 'paid' | 'unpaid' | 'partial'
  due_date: string | null
  notes: string | null
  created_at: string
  // Joined fields
  customer_name?: string
}

// ── Customers ───────────────────────────────────────────────

export async function findOrCreateCustomer(
  userId: string,
  name: string
): Promise<Customer | null> {
  const supabase = await createClient()
  const normalizedName = name.trim()

  // Try to find existing customer (case-insensitive)
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', normalizedName)
    .limit(1)
    .single()

  if (existing) return existing

  // Create new customer
  const { data: created, error } = await supabase
    .from('customers')
    .insert({ user_id: userId, name: normalizedName })
    .select()
    .single()

  if (error) {
    console.error('findOrCreateCustomer error:', error)
    return null
  }
  return created
}

// ── Invoice Number ──────────────────────────────────────────

export async function getNextInvoiceNumber(userId: string): Promise<string> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const next = (count ?? 0) + 1
  return `INV-${String(next).padStart(3, '0')}`
}

// ── Create Invoice ──────────────────────────────────────────

export async function createInvoice(
  userId: string,
  data: {
    transactionId: string
    customerName: string
    amount: number
    taxRate?: number
    dueDate?: string
    notes?: string
  }
): Promise<Invoice | null> {
  const supabase = await createClient()

  // Find or create customer
  const customer = await findOrCreateCustomer(userId, data.customerName)

  const { data: sourceTransaction } = await supabase
    .from('transactions')
    .select('payment_status, paid_amount')
    .eq('id', data.transactionId)
    .eq('user_id', userId)
    .limit(1)
    .single()

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber(userId)

  const taxRate = data.taxRate ?? 0
  const taxAmount = Math.round(data.amount * (taxRate / 100) * 100) / 100
  const totalAmount = data.amount + taxAmount
  const paymentStatus =
    sourceTransaction?.payment_status === 'paid' || sourceTransaction?.payment_status === 'partial'
      ? sourceTransaction.payment_status
      : 'unpaid'

  // Default due date: 30 days from now
  const dueDate = data.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let notes = data.notes?.trim() || ''
  if (paymentStatus === 'partial' && sourceTransaction?.paid_amount != null) {
    const paidAmount = Number(sourceTransaction.paid_amount)
    const outstandingAmount = Math.max(totalAmount - paidAmount, 0)
    const partialNote = `Partial payment received: Rs. ${paidAmount.toFixed(2)} | Outstanding: Rs. ${outstandingAmount.toFixed(2)}`
    notes = notes ? `${notes}\n${partialNote}` : partialNote
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      customer_id: customer?.id ?? null,
      transaction_id: data.transactionId,
      invoice_number: invoiceNumber,
      amount: data.amount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: paymentStatus,
      due_date: dueDate,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('createInvoice error:', error)
    return null
  }

  return { ...invoice, customer_name: data.customerName }
}

// ── Get Invoices by Customer ────────────────────────────────

export async function getInvoicesByCustomer(
  userId: string,
  customerName: string
): Promise<Invoice[]> {
  const supabase = await createClient()

  // Find customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', customerName.trim())
    .limit(1)
    .single()

  if (!customer) return []

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map((inv) => ({ ...inv, customer_name: customerName }))
}

// ── Customer Statement ──────────────────────────────────────

export interface StatementTransaction {
  id: string
  date: string
  description: string | null
  type: 'income' | 'expense'
  amount: number
  category: string
  bill_number: string | null
  payment_status: string
  paid_amount: number | null
  items: { item_name: string; quantity: number; unit: string; rate: number; total: number }[]
}

export interface CustomerStatement {
  customerName: string
  transactions: StatementTransaction[]
  invoices: {
    invoiceNumber: string
    amount: number
    totalAmount: number
    status: string
    dueDate: string | null
    createdAt: string
  }[]
  totalSales: number
  totalPurchases: number
  totalPaid: number
  totalOutstanding: number
}

export async function getCustomerStatement(
  userId: string,
  customerName: string
): Promise<CustomerStatement> {
  const supabase = await createClient()
  const name = customerName.trim()

  // Get all transactions for this customer (fuzzy match) — include full details
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, date, description, type, amount, category, bill_number, payment_status, paid_amount')
    .eq('user_id', userId)
    .ilike('customer_name', `%${name}%`)
    .order('date', { ascending: false })

  // Get customer and their invoices (fuzzy match)
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', `%${name}%`)
    .limit(1)
    .single()

  let invoices: CustomerStatement['invoices'] = []
  if (customer) {
    const { data: invData } = await supabase
      .from('invoices')
      .select('invoice_number, amount, total_amount, status, due_date, created_at')
      .eq('user_id', userId)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    invoices = (invData ?? []).map((inv) => ({
      invoiceNumber: inv.invoice_number,
      amount: Number(inv.amount),
      totalAmount: Number(inv.total_amount),
      status: inv.status,
      dueDate: inv.due_date,
      createdAt: inv.created_at,
    }))
  }

  // Fetch line items for each transaction
  const txIds = (transactions ?? []).map((t) => t.id)
  let allItems: { transaction_id: string; item_name: string; quantity: number; unit: string; rate: number; total: number }[] = []

  if (txIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('transaction_items')
      .select('transaction_id, item_name, quantity, unit, rate, total')
      .in('transaction_id', txIds)

    allItems = (itemsData ?? []).map((i) => ({
      transaction_id: i.transaction_id,
      item_name: i.item_name,
      quantity: Number(i.quantity),
      unit: i.unit,
      rate: Number(i.rate),
      total: Number(i.total),
    }))
  }

  const txList: StatementTransaction[] = (transactions ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    description: t.description,
    type: t.type as 'income' | 'expense',
    amount: Number(t.amount),
    category: t.category,
    bill_number: t.bill_number ?? null,
    payment_status: t.payment_status ?? 'paid',
    paid_amount: t.paid_amount != null ? Number(t.paid_amount) : null,
    items: allItems.filter((i) => i.transaction_id === t.id),
  }))

  const totalSales = txList
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalPurchases = txList
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalPaid = txList
    .filter((t) => t.payment_status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOutstanding = txList
    .filter((t) => t.payment_status !== 'paid')
    .reduce((sum, t) => {
      const paid = t.paid_amount ?? 0
      return sum + (t.amount - paid)
    }, 0)

  return {
    customerName: name,
    transactions: txList,
    invoices,
    totalSales,
    totalPurchases,
    totalPaid,
    totalOutstanding,
  }
}

// ── Sales Report (all customers) ────────────────────────────

export interface SalesReportEntry {
  date: string
  customer_name: string | null
  description: string | null
  amount: number
  bill_number: string | null
  payment_status: string
  paid_amount: number | null
  items: { item_name: string; quantity: number; unit: string; rate: number; total: number }[]
}

export interface SalesReport {
  entries: SalesReportEntry[]
  totalSales: number
  totalPaid: number
  totalOutstanding: number
  totalTransactions: number
  topProducts: { name: string; quantity: number; revenue: number }[]
  topCustomers: { name: string; total: number }[]
}

export async function getSalesReport(userId: string): Promise<SalesReport> {
  const supabase = await createClient()

  // Get all Sales transactions
  const { data: salesTxs } = await supabase
    .from('transactions')
    .select('id, date, customer_name, description, amount, bill_number, payment_status, paid_amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .eq('category', 'Sales')
    .order('date', { ascending: false })

  const txIds = (salesTxs ?? []).map((t) => t.id)

  // Fetch all line items
  let allItems: { transaction_id: string; item_name: string; quantity: number; unit: string; rate: number; total: number }[] = []
  if (txIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('transaction_items')
      .select('transaction_id, item_name, quantity, unit, rate, total')
      .in('transaction_id', txIds)

    allItems = (itemsData ?? []).map((i) => ({
      transaction_id: i.transaction_id,
      item_name: i.item_name,
      quantity: Number(i.quantity),
      unit: i.unit,
      rate: Number(i.rate),
      total: Number(i.total),
    }))
  }

  const entries: SalesReportEntry[] = (salesTxs ?? []).map((t) => ({
    date: t.date,
    customer_name: t.customer_name,
    description: t.description,
    amount: Number(t.amount),
    bill_number: t.bill_number ?? null,
    payment_status: t.payment_status ?? 'paid',
    paid_amount: t.paid_amount != null ? Number(t.paid_amount) : null,
    items: allItems.filter((i) => i.transaction_id === t.id),
  }))

  const totalSales = entries.reduce((s, e) => s + e.amount, 0)
  const totalPaid = entries.filter((e) => e.payment_status === 'paid').reduce((s, e) => s + e.amount, 0)
    + entries.filter((e) => e.payment_status === 'partial').reduce((s, e) => s + (e.paid_amount ?? 0), 0)
  const totalOutstanding = totalSales - totalPaid

  // Top products
  const productMap = new Map<string, { quantity: number; revenue: number }>()
  for (const item of allItems) {
    const existing = productMap.get(item.item_name) ?? { quantity: 0, revenue: 0 }
    existing.quantity += item.quantity
    existing.revenue += item.total
    productMap.set(item.item_name, existing)
  }
  const topProducts = Array.from(productMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Top customers
  const customerMap = new Map<string, number>()
  for (const e of entries) {
    if (e.customer_name) {
      customerMap.set(e.customer_name, (customerMap.get(e.customer_name) ?? 0) + e.amount)
    }
  }
  const topCustomers = Array.from(customerMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return { entries, totalSales, totalPaid, totalOutstanding, totalTransactions: entries.length, topProducts, topCustomers }
}

// ── Customer Outstanding ────────────────────────────────────

export async function getCustomerOutstanding(
  userId: string,
  customerName: string
): Promise<{ customerName: string; outstanding: number; unpaidInvoices: number }> {
  const supabase = await createClient()
  const name = customerName.trim()

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', `%${name}%`)
    .limit(1)
    .single()

  if (!customer) {
    return { customerName: name, outstanding: 0, unpaidInvoices: 0 }
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, status')
    .eq('user_id', userId)
    .eq('customer_id', customer.id)
    .neq('status', 'paid')

  const outstanding = (invoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0
  )

  return {
    customerName: name,
    outstanding,
    unpaidInvoices: (invoices ?? []).length,
  }
}

// ── Update Invoice Status ───────────────────────────────────

export async function updateInvoiceStatus(
  userId: string,
  invoiceId: string,
  status: 'paid' | 'unpaid' | 'partial'
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .eq('user_id', userId)

  if (error) {
    console.error('updateInvoiceStatus error:', error)
    return false
  }
  return true
}

// ── Manage Invoices via Prompt ──────────────────────────────

export async function getInvoiceByNumber(
  userId: string,
  invoiceNumber: string
): Promise<Invoice | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name)
    `)
    .eq('user_id', userId)
    .eq('invoice_number', invoiceNumber.trim().toUpperCase())
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    ...data,
    customer_name: (data as any).customer?.name,
  }
}

export async function updateInvoice(
  userId: string,
  invoiceNumber: string,
  updates: {
    amount?: number | null
    status?: 'paid' | 'unpaid' | 'partial' | null
    due_date?: string | null
  }
): Promise<Invoice | null> {
  const supabase = await createClient()

  // First fetch the existing invoice by invoice_number (not by id)
  const { data: existing } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .ilike('invoice_number', invoiceNumber.trim())
    .limit(1)
    .single()

  if (!existing) return null

  const dbUpdates: any = {}
  
  if (updates.amount !== undefined && updates.amount !== null) {
    dbUpdates.amount = updates.amount
    const taxRate = Number(existing.tax_rate)
    const taxAmount = Math.round(updates.amount * (taxRate / 100) * 100) / 100
    dbUpdates.tax_amount = taxAmount
    dbUpdates.total_amount = updates.amount + taxAmount
  }

  if (updates.status !== undefined && updates.status !== null) {
    dbUpdates.status = updates.status
  }

  if (updates.due_date !== undefined && updates.due_date !== null) {
    dbUpdates.due_date = updates.due_date
  }

  if (Object.keys(dbUpdates).length === 0) return { ...existing, customer_name: undefined }

  const { data: updated, error } = await supabase
    .from('invoices')
    .update(dbUpdates)
    .eq('id', existing.id)
    .eq('user_id', userId)
    .select(`
      *,
      customer:customers(name)
    `)
    .single()

  if (error) {
    console.error('updateInvoice error:', error)
    return null
  }

  return {
    ...updated,
    customer_name: (updated as any).customer?.name,
  }
}

export async function deleteInvoice(
  userId: string,
  invoiceId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', userId)

  if (error) {
    console.error('deleteInvoice error:', error)
    return false
  }
  return true
}

// ── Customer Database Stats ─────────────────────────────────

export interface CustomerStats {
  id: string
  name: string
  totalSales: number
  outstandingBalance: number
}

export async function getAllCustomersWithStats(userId: string): Promise<CustomerStats[]> {
  const supabase = await createClient()

  // 1. Fetch all customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .eq('user_id', userId)
    .order('name')

  if (!customers || customers.length === 0) return []

  // 2. Fetch all income transactions for this user
  const { data: transactions } = await supabase
    .from('transactions')
    .select('customer_name, amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .not('customer_name', 'is', null)

  // 3. Fetch all unpaid/partial invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('customer_id, total_amount')
    .eq('user_id', userId)
    .neq('status', 'paid')

  // Aggregate stats per customer
  const statsMap = new Map<string, CustomerStats>()

  for (const c of customers) {
    statsMap.set(c.id, {
      id: c.id,
      name: c.name,
      totalSales: 0,
      outstandingBalance: 0,
    })
  }

  // Add outstanding balances
  if (invoices) {
    for (const inv of invoices) {
      if (inv.customer_id && statsMap.has(inv.customer_id)) {
        const stats = statsMap.get(inv.customer_id)!
        stats.outstandingBalance += Number(inv.total_amount)
      }
    }
  }

  // Add total sales
  if (transactions) {
    for (const tx of transactions) {
      if (!tx.customer_name) continue
      const matchedCustomer = customers.find(c => c.name.toLowerCase() === tx.customer_name!.toLowerCase())
      if (matchedCustomer && statsMap.has(matchedCustomer.id)) {
        const stats = statsMap.get(matchedCustomer.id)!
        stats.totalSales += Number(tx.amount)
      }
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => b.totalSales - a.totalSales)
}
