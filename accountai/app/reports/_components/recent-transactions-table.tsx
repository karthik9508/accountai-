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

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
      <div className="flex items-start justify-between border-b border-white/5 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
          <p className="mt-1 text-[11px] text-gray-500">
            Transaction updates are handled in chat so the AI can keep the context together.
          </p>
        </div>
        <Link href="/chat" className="text-xs text-emerald-500 transition hover:text-emerald-400">
          + Add via chat
        </Link>
      </div>

      {initialRecent.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-600">No transactions yet.</p>
          <Link href="/chat" className="mt-2 inline-block text-xs text-emerald-500 hover:text-emerald-400">
            Start recording in chat
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-600">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">Description</th>
                <th className="px-5 py-3 text-left font-medium">Category</th>
                <th className="px-5 py-3 text-left font-medium">Type</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {initialRecent.map((tx, i) => (
                <tr
                  key={tx.id}
                  className={`border-b border-white/5 transition hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                >
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="max-w-[180px] px-5 py-3 text-gray-300 truncate">{tx.description ?? '-'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-gray-400">{tx.category}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-semibold ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {fmt(tx.amount)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={buildChatPrompt(tx)}
                      className="inline-flex items-center rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-gray-300 transition hover:border-emerald-500/30 hover:text-emerald-400"
                    >
                      Update in chat
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
