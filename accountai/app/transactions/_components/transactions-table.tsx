'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Transaction, TransactionItem, Payment } from '@/lib/transactions'
import {
  updateTransactionAction,
  deleteTransactionAction,
  addItemAction,
  deleteItemAction,
  addPaymentAction,
  getTransactionDetailsAction,
} from '@/app/actions/transactions'

const CATEGORIES = [
  'Sales', 'Purchase', 'Groceries', 'Food & Dining', 'Transport', 'Salary', 'Freelance',
  'Shopping', 'Utilities', 'Healthcare', 'Entertainment', 'Education',
  'Rent', 'Investment', 'Transfer', 'Other',
]

const PAGE_SIZE = 15

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function statusStyle(status: string) {
  const m: Record<string, string> = {
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    unpaid: 'bg-red-500/10 text-red-400 border-red-500/20',
    partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }
  return m[status] || m.paid
}

export default function TransactionsTable({ transactions: initial }: { transactions: Transaction[] }) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Transaction>>({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<TransactionItem[]>([])
  const [expandedPayments, setExpandedPayments] = useState<Payment[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Add item form
  const [newItem, setNewItem] = useState({ item_name: '', quantity: 1, unit: 'pcs', rate: 0, gst_rate: 0 })
  const [addingItem, setAddingItem] = useState(false)

  // Add payment form
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_mode: 'cash' as const, reference: '', notes: '' })
  const [addingPayment, setAddingPayment] = useState(false)

  const filtered = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (tx.description?.toLowerCase().includes(q)) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.customer_name?.toLowerCase().includes(q)) ||
      (tx.bill_number?.toLowerCase().includes(q)) ||
      String(tx.amount).includes(q)
    )
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const startEdit = useCallback((tx: Transaction) => {
    setEditingId(tx.id)
    setEditData({
      amount: tx.amount, type: tx.type, category: tx.category,
      description: tx.description, customer_name: tx.customer_name,
      payment_status: tx.payment_status ?? 'paid', paid_amount: tx.paid_amount,
      bill_number: tx.bill_number, date: tx.date,
    })
  }, [])

  const cancelEdit = useCallback(() => { setEditingId(null); setEditData({}) }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const result = await updateTransactionAction(editingId, {
        amount: editData.amount, type: editData.type, category: editData.category,
        description: editData.description, customer_name: editData.customer_name,
        payment_status: editData.payment_status,
        paid_amount: editData.payment_status === 'partial' ? editData.paid_amount : null,
        bill_number: (editData.category === 'Sales' || editData.category === 'Purchase') ? (editData.bill_number || null) : null,
        date: editData.date,
      })
      if (result.success && result.transaction) {
        setTransactions(prev => prev.map(tx => tx.id === editingId ? { ...tx, ...result.transaction } : tx))
        cancelEdit()
        router.refresh()
      }
    } finally { setSaving(false) }
  }, [editingId, editData, router, cancelEdit])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this transaction permanently?')) return
    setDeletingId(id)
    try {
      const result = await deleteTransactionAction(id)
      if (result.error) {
        alert(`Failed to delete: ${result.error}`)
        return
      }
      if (result.success) {
        setTransactions(prev => prev.filter(tx => tx.id !== id))
        router.refresh()
      }
    } catch (err) {
      alert('Network error — please try again.')
    } finally { setDeletingId(null) }
  }, [router])

  const toggleExpand = useCallback(async (txId: string) => {
    if (expandedId === txId) {
      setExpandedId(null)
      return
    }
    setExpandedId(txId)
    setLoadingDetails(true)
    try {
      const result = await getTransactionDetailsAction(txId)
      if (result.success) {
        setExpandedItems(result.items ?? [])
        setExpandedPayments(result.payments ?? [])
      }
    } finally { setLoadingDetails(false) }
  }, [expandedId])

  const handleAddItem = useCallback(async (txId: string) => {
    if (!newItem.item_name || newItem.rate <= 0) return
    setAddingItem(true)
    try {
      const result = await addItemAction(txId, newItem)
      if (result.success && result.item) {
        setExpandedItems(prev => [...prev, result.item!])
        setNewItem({ item_name: '', quantity: 1, unit: 'pcs', rate: 0, gst_rate: 0 })
        router.refresh()
      }
    } finally { setAddingItem(false) }
  }, [newItem, router])

  const handleDeleteItem = useCallback(async (txId: string, itemId: string) => {
    const result = await deleteItemAction(txId, itemId)
    if (result.success) {
      setExpandedItems(prev => prev.filter(i => i.id !== itemId))
      router.refresh()
    }
  }, [router])

  const handleAddPayment = useCallback(async (txId: string) => {
    if (newPayment.amount <= 0) return
    setAddingPayment(true)
    try {
      const result = await addPaymentAction(txId, {
        amount: newPayment.amount,
        payment_mode: newPayment.payment_mode,
        reference: newPayment.reference || null,
        notes: newPayment.notes || null,
      })
      if (result.success && result.payment) {
        setExpandedPayments(prev => [result.payment!, ...prev])
        setNewPayment({ amount: 0, payment_mode: 'cash', reference: '', notes: '' })
        router.refresh()
      }
    } finally { setAddingPayment(false) }
  }, [newPayment, router])

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/15 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Income</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-400">{fmt(totalIncome)}</p>
        </div>
        <div className="rounded-2xl border border-red-500/15 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Expenses</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-red-400">{fmt(totalExpense)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Net</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          {(['all', 'income', 'expense'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setPage(0) }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterType === t
                  ? t === 'income' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25'
                  : t === 'expense' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25'
                  : 'bg-white/10 text-white ring-1 ring-white/20'
                  : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
              }`}
            >
              {t === 'all' ? '📊 All' : t === 'income' ? '💰 Income' : '💸 Expense'}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="w-full sm:w-56 rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-xs text-white outline-none placeholder-gray-600 focus:border-emerald-500/40 transition"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <span className="text-xl">📭</span>
            </div>
            <p className="text-sm text-gray-500">{search ? 'No matching transactions.' : 'No transactions yet.'}</p>
            {!search && (
              <Link href="/chat" className="mt-2 inline-block text-xs text-emerald-500 hover:text-emerald-400">
                Start recording in chat →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Bill No.</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx, i) => {
                    const isEditing = editingId === tx.id

                    if (isEditing) {
                      return (
                        <tr key={tx.id} className="border-b border-amber-500/10 bg-amber-500/[0.03]">
                          <td className="px-4 py-2">
                            <input type="date" value={editData.date ?? ''} onChange={e => setEditData(d => ({ ...d, date: e.target.value }))}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/40" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={editData.description ?? ''} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                              placeholder="Description" className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/40 placeholder-gray-600" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" value={editData.customer_name ?? ''} onChange={e => setEditData(d => ({ ...d, customer_name: e.target.value || null }))}
                              placeholder="Customer" className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/40 placeholder-gray-600" />
                          </td>
                          <td className="px-4 py-2">
                            <select value={editData.category ?? ''} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                              className="w-full rounded-lg border border-white/10 bg-[#111815] px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/40">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              {(['income', 'expense'] as const).map(t => (
                                <button key={t} onClick={() => setEditData(d => ({ ...d, type: t }))}
                                  className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase transition ${
                                    editData.type === t
                                      ? t === 'income' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                                      : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                  }`}>{t === 'income' ? '▲' : '▼'}</button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <select value={editData.payment_status ?? 'paid'} onChange={e => setEditData(d => ({ ...d, payment_status: e.target.value as any }))}
                              className="w-full rounded-lg border border-white/10 bg-[#111815] px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/40">
                              <option value="paid">Paid</option>
                              <option value="unpaid">Unpaid</option>
                              <option value="partial">Partial</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            {(editData.category === 'Sales' || editData.category === 'Purchase') ? (
                              <input type="text" value={editData.bill_number ?? ''} onChange={e => setEditData(d => ({ ...d, bill_number: e.target.value || null }))}
                                placeholder="Bill No." className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/40 placeholder-gray-600" />
                            ) : (
                              <span className="text-gray-700">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={editData.amount ?? ''} onChange={e => setEditData(d => ({ ...d, amount: Number(e.target.value) }))}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white text-right outline-none focus:border-amber-500/40" />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={saveEdit} disabled={saving}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                                {saving ? '...' : '✓ Save'}
                              </button>
                              <button onClick={cancelEdit}
                                className="rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-gray-400 hover:bg-white/10 transition">
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <React.Fragment key={tx.id}>
                      <tr
                        className={`group border-b border-white/[0.03] transition-colors hover:bg-white/[0.03] ${i % 2 ? 'bg-white/[0.01]' : ''} ${deletingId === tx.id ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="max-w-[160px] px-4 py-3 text-gray-300 truncate">
                          {tx.description || <span className="text-gray-700 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{tx.customer_name || <span className="text-gray-700">—</span>}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-white/5 bg-white/[0.04] px-2 py-0.5 text-[11px] text-gray-400">{tx.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            <span className="text-[8px]">{tx.type === 'income' ? '▲' : '▼'}</span>{tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle(tx.payment_status ?? 'paid')}`}>
                            {tx.payment_status ?? 'paid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {(tx.category === 'Sales' || tx.category === 'Purchase') && tx.bill_number
                            ? <span className="text-blue-400 font-medium">{tx.bill_number}</span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(tx.category === 'Sales' || tx.category === 'Purchase') && (
                              <button onClick={() => toggleExpand(tx.id)}
                                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${expandedId === tx.id
                                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400'}`}>
                                📋 Details
                              </button>
                            )}
                            <button onClick={() => startEdit(tx)}
                              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-gray-400 transition hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400">
                              ✏️ Edit
                            </button>
                            <button onClick={() => handleDelete(tx.id)} disabled={deletingId === tx.id}
                              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detail Row */}
                      {expandedId === tx.id && (
                        <tr>
                          <td colSpan={9} className="bg-white/[0.02] border-b border-white/5 p-0">
                            <div className="p-4 space-y-4">
                              {loadingDetails ? (
                                <div className="text-center text-gray-500 py-4 text-xs">Loading details...</div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {/* Line Items Panel */}
                                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                    <h4 className="text-xs font-semibold text-gray-300 mb-2">📦 Line Items ({expandedItems.length})</h4>
                                    {expandedItems.length > 0 ? (
                                      <table className="w-full text-[11px] mb-2">
                                        <thead>
                                          <tr className="border-b border-white/5 text-gray-500">
                                            <th className="text-left py-1 pr-2">Item</th>
                                            <th className="text-right py-1 px-1">Qty</th>
                                            <th className="text-right py-1 px-1">Rate</th>
                                            <th className="text-right py-1 px-1">GST%</th>
                                            <th className="text-right py-1 px-1">Total</th>
                                            <th className="py-1 w-6"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expandedItems.map(item => (
                                            <tr key={item.id} className="border-b border-white/[0.03] text-gray-400">
                                              <td className="py-1.5 pr-2 text-gray-300">{item.item_name} <span className="text-gray-600">({item.unit})</span></td>
                                              <td className="py-1.5 px-1 text-right tabular-nums">{item.quantity}</td>
                                              <td className="py-1.5 px-1 text-right tabular-nums">{fmt(item.rate)}</td>
                                              <td className="py-1.5 px-1 text-right tabular-nums">{item.gst_rate}%</td>
                                              <td className="py-1.5 px-1 text-right tabular-nums font-medium text-gray-300">{fmt(item.total)}</td>
                                              <td className="py-1.5">
                                                <button onClick={() => handleDeleteItem(tx.id, item.id)}
                                                  className="text-red-500/60 hover:text-red-400 text-[9px]">✕</button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p className="text-gray-600 text-[11px] mb-2">No line items yet.</p>
                                    )}
                                    {/* Add Item Form */}
                                    <div className="flex flex-wrap gap-1.5 items-end mt-2">
                                      <input type="text" placeholder="Item name" value={newItem.item_name}
                                        onChange={e => setNewItem(d => ({ ...d, item_name: e.target.value }))}
                                        className="flex-1 min-w-[100px] rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-blue-500/40 placeholder-gray-600" />
                                      <input type="number" placeholder="Qty" value={newItem.quantity || ''}
                                        onChange={e => setNewItem(d => ({ ...d, quantity: Number(e.target.value) }))}
                                        className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white text-right outline-none focus:border-blue-500/40" />
                                      <select value={newItem.unit} onChange={e => setNewItem(d => ({ ...d, unit: e.target.value }))}
                                        className="w-16 rounded-md border border-white/10 bg-[#111815] px-1 py-1.5 text-[11px] text-white outline-none">
                                        {['pcs', 'kg', 'ltr', 'box', 'mtr', 'dz'].map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                      <input type="number" placeholder="Rate" value={newItem.rate || ''}
                                        onChange={e => setNewItem(d => ({ ...d, rate: Number(e.target.value) }))}
                                        className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white text-right outline-none focus:border-blue-500/40" />
                                      <input type="number" placeholder="GST%" value={newItem.gst_rate || ''}
                                        onChange={e => setNewItem(d => ({ ...d, gst_rate: Number(e.target.value) }))}
                                        className="w-16 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white text-right outline-none focus:border-blue-500/40" />
                                      <button onClick={() => handleAddItem(tx.id)} disabled={addingItem || !newItem.item_name}
                                        className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition">
                                        {addingItem ? '...' : '+ Add'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Payments Panel */}
                                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                    <h4 className="text-xs font-semibold text-gray-300 mb-2">💳 Payments ({expandedPayments.length})</h4>
                                    {expandedPayments.length > 0 ? (
                                      <table className="w-full text-[11px] mb-2">
                                        <thead>
                                          <tr className="border-b border-white/5 text-gray-500">
                                            <th className="text-left py-1">Date</th>
                                            <th className="text-left py-1">Mode</th>
                                            <th className="text-left py-1">Ref</th>
                                            <th className="text-right py-1">Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {expandedPayments.map(p => (
                                            <tr key={p.id} className="border-b border-white/[0.03] text-gray-400">
                                              <td className="py-1.5">{new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                                              <td className="py-1.5">
                                                <span className="rounded-full bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] uppercase">{p.payment_mode}</span>
                                              </td>
                                              <td className="py-1.5 text-gray-500 truncate max-w-[80px]">{p.reference || '—'}</td>
                                              <td className="py-1.5 text-right tabular-nums font-medium text-emerald-400">+{fmt(p.amount)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p className="text-gray-600 text-[11px] mb-2">No payments recorded yet.</p>
                                    )}
                                    {/* Add Payment Form */}
                                    <div className="flex flex-wrap gap-1.5 items-end mt-2">
                                      <input type="number" placeholder="Amount" value={newPayment.amount || ''}
                                        onChange={e => setNewPayment(d => ({ ...d, amount: Number(e.target.value) }))}
                                        className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white text-right outline-none focus:border-emerald-500/40" />
                                      <select value={newPayment.payment_mode}
                                        onChange={e => setNewPayment(d => ({ ...d, payment_mode: e.target.value as any }))}
                                        className="w-20 rounded-md border border-white/10 bg-[#111815] px-1 py-1.5 text-[11px] text-white outline-none">
                                        {['cash', 'upi', 'bank', 'cheque', 'other'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                                      </select>
                                      <input type="text" placeholder="Ref #" value={newPayment.reference}
                                        onChange={e => setNewPayment(d => ({ ...d, reference: e.target.value }))}
                                        className="flex-1 min-w-[60px] rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500/40 placeholder-gray-600" />
                                      <button onClick={() => handleAddPayment(tx.id)} disabled={addingPayment || newPayment.amount <= 0}
                                        className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                                        {addingPayment ? '...' : '+ Pay'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
                <p className="text-[11px] text-gray-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-white/[0.06] disabled:opacity-30">
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(0, Math.min(page - 2, totalPages - 5))
                    const num = start + i
                    return (
                      <button key={num} onClick={() => setPage(num)}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                          page === num ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25' : 'text-gray-500 hover:bg-white/5'
                        }`}>{num + 1}</button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-white/[0.06] disabled:opacity-30">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
