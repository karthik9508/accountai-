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

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber(userId)

  const taxRate = data.taxRate ?? 0
  const taxAmount = Math.round(data.amount * (taxRate / 100) * 100) / 100
  const totalAmount = data.amount + taxAmount

  // Default due date: 30 days from now
  const dueDate = data.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
      status: 'unpaid',
      due_date: dueDate,
      notes: data.notes ?? null,
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

export interface CustomerStatement {
  customerName: string
  transactions: {
    date: string
    description: string | null
    type: 'income' | 'expense'
    amount: number
    category: string
  }[]
  invoices: {
    invoiceNumber: string
    amount: number
    totalAmount: number
    status: string
    dueDate: string | null
    createdAt: string
  }[]
  totalSales: number
  totalPaid: number
  totalOutstanding: number
}

export async function getCustomerStatement(
  userId: string,
  customerName: string
): Promise<CustomerStatement> {
  const supabase = await createClient()
  const name = customerName.trim()

  // Get all transactions for this customer
  const { data: transactions } = await supabase
    .from('transactions')
    .select('date, description, type, amount, category')
    .eq('user_id', userId)
    .ilike('customer_name', name)
    .order('date', { ascending: false })

  // Get customer and their invoices
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
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

  const txList = (transactions ?? []).map((t) => ({
    ...t,
    amount: Number(t.amount),
  }))

  const totalSales = txList
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  const totalOutstanding = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0)

  return {
    customerName: name,
    transactions: txList,
    invoices,
    totalSales,
    totalPaid,
    totalOutstanding,
  }
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
    .ilike('name', name)
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
  invoiceId: string,
  updates: {
    amount?: number | null
    status?: 'paid' | 'unpaid' | 'partial' | null
    due_date?: string | null
  }
): Promise<Invoice | null> {
  const supabase = await createClient()

  // First fetch the existing invoice to recalculate tax and total if amount changes
  const { data: existing } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', userId)
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

  const { data: updated, error } = await supabase
    .from('invoices')
    .update(dbUpdates)
    .eq('id', invoiceId)
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
