import Link from 'next/link'
import { Transaction } from '@/lib/transactions'

export function RecentTransactionsTable({ initialRecent }: { initialRecent: Transaction[] }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const buildChatPrompt = (tx: Transaction) => {
    const pieces = [
      'I want to update this transaction.',
      `Current type: ${tx.type}.`,
      `Current amount: Rs ${Number(tx.amount)}.`,
      `Current category: ${tx.category}.`,
      `Date: ${tx.date}.`,
    ]

    if (tx.customer_name) {
      pieces.push(`Customer: ${tx.customer_name}.`)
    }

    if (tx.description) {
      pieces.push(`Description: ${tx.description}.`)
    }

    pieces.push('Please change it to:')

    return `/chat?prompt=${encodeURIComponent(pieces.join(' '))}`
  }

  const statusBadge = (tx: Transaction) => {
    const status = tx.payment_status ?? 'paid'
    const styles = {
      paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      unpaid: 'bg-red-500/10 text-red-400 border-red-500/20',
      partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    }
    return styles[status] || styles.paid
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03]">
      <div className="flex items-start justify-between border-b border-white/5 bg-white/[0.01] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm">📋</span>
            <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Transaction updates are handled in chat so the AI can keep the context together.
          </p>
        </div>
        <Link
          href="/chat"
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30"
        >
          <span>+</span> Add via chat
        </Link>
      </div>

      {initialRecent.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <span className="text-xl">📭</span>
          </div>
          <p className="text-sm text-gray-500">No transactions yet.</p>
          <Link href="/chat" className="mt-2 inline-block text-xs text-emerald-500 hover:text-emerald-400">
            Start recording in chat →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500 w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {initialRecent.map((tx, i) => (
                <tr
                  key={tx.id}
                  className={`group border-b border-white/[0.03] transition-colors duration-200 hover:bg-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                >
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="max-w-[200px] px-5 py-3.5 text-gray-300 truncate">
                    {tx.description ?? <span className="text-gray-600 italic">No description</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full border border-white/5 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      <span className="text-[8px]">{tx.type === 'income' ? '▲' : '▼'}</span>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge(tx)}`}>
                      {tx.payment_status ?? 'paid'}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3.5 text-right font-bold tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {fmt(tx.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={buildChatPrompt(tx)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400"
                    >
                      ✏️ Update
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
