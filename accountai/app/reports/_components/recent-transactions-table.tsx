'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/transactions'
import { editTransactionAction } from '../actions'

const CATEGORIES = [
  'Sales', 'Purchase', 'Groceries', 'Food & Dining', 'Transport', 
  'Salary', 'Freelance', 'Shopping', 'Utilities', 'Healthcare', 
  'Entertainment', 'Education', 'Rent', 'Investment', 'Transfer', 'Other'
]

export function RecentTransactionsTable({ initialRecent }: { initialRecent: Transaction[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Transaction>>({})
  const [isSaving, setIsSaving] = useState(false)

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setEditData({
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      description: tx.description || '',
      date: tx.date,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleSave = async (id: string) => {
    try {
      setIsSaving(true)
      await editTransactionAction(id, {
        amount: Number(editData.amount),
        type: editData.type as 'income' | 'expense',
        category: editData.category,
        description: editData.description || null,
        date: editData.date,
      })
      setEditingId(null)
      setEditData({})
    } catch (error) {
      console.error('Failed to update transaction:', error)
      alert('Failed to update transaction.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
        <a href="/chat" className="text-xs text-emerald-500 hover:text-emerald-400 transition">
          + Add via chat →
        </a>
      </div>
      {initialRecent.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-600">No transactions yet.</p>
          <a href="/chat" className="mt-2 inline-block text-xs text-emerald-500 hover:text-emerald-400">
            Start recording in Chat →
          </a>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-600 border-b border-white/5">
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Description</th>
                <th className="text-left px-5 py-3 font-medium">Category</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-right px-5 py-3 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialRecent.map((tx, i) => (
                <tr
                  key={tx.id}
                  className={`border-b border-white/5 hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                >
                  {editingId === tx.id ? (
                    <>
                      <td className="px-5 py-3">
                        <input
                          type="date"
                          value={editData.date || ''}
                          onChange={e => setEditData({ ...editData, date: e.target.value })}
                          className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500/50"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={editData.description || ''}
                          onChange={e => setEditData({ ...editData, description: e.target.value })}
                          className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500/50"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={editData.category || ''}
                          onChange={e => setEditData({ ...editData, category: e.target.value })}
                          className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500/50"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={editData.type || ''}
                          onChange={e => setEditData({ ...editData, type: e.target.value as any })}
                          className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500/50"
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          value={editData.amount || ''}
                          onChange={e => setEditData({ ...editData, amount: Number(e.target.value) })}
                          className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-right text-white outline-none focus:border-emerald-500/50"
                        />
                      </td>
                      <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleSave(tx.id)}
                          disabled={isSaving}
                          className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          {isSaving ? '⏳' : '✓'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-5 py-3 text-gray-300 max-w-[160px] truncate">{tx.description ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-gray-400">{tx.category}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${
                          tx.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => startEdit(tx)}
                          className="text-gray-500 hover:text-white transition text-base"
                          title="Edit Transaction"
                        >
                          ✏️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
