'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Transaction } from '@/lib/transactions'
import { updateTransactionAction, deleteTransactionAction } from '@/app/actions/transactions'

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

  const filtered = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (tx.description?.toLowerCase().includes(q)) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.customer_name?.toLowerCase().includes(q)) ||
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
      payment_status: tx.payment_status ?? 'paid', paid_amount: tx.paid_amount, date: tx.date,
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
                      <tr key={tx.id}
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
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
