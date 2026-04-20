import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getRecentTransactions,
  getBalance,
} from '@/lib/transactions'
import { getAllCustomersWithStats } from '@/lib/invoices'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const [summary, expenseBreakdown, incomeBreakdown, recent, balance, customers] = await Promise.all([
    getMonthlySummary(user.id, now.getFullYear(), now.getMonth() + 1),
    getCategoryBreakdown(user.id, 'expense', 6),
    getCategoryBreakdown(user.id, 'income', 6),
    getRecentTransactions(user.id, 15),
    getBalance(user.id),
    getAllCustomersWithStats(user.id),
  ])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="flex min-h-screen bg-[#080c0a]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/5 bg-[#0a0f0d] px-4 py-6">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">FintraBooks</span>
        </div>
        <nav className="space-y-1">
          {[
            { href: '/chat', label: 'Chat', icon: '💬', active: false },
            { href: '/reports', label: 'Reports', icon: '📊', active: true },
            { href: '/settings', label: 'Settings', icon: '⚙', active: false },
          ].map((item) => (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                item.active ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}>
              <span>{item.icon}</span>{item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <header className="px-6 py-5 border-b border-white/5">
          <h1 className="text-xl font-bold text-white">Financial Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">{monthName} · All-time balance: <span className={balance >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{fmt(balance)}</span></p>
        </header>

        <div className="p-6 space-y-6">
          {/* Monthly KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Income', value: fmt(summary.totalIncome), color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', icon: '💰' },
              { label: 'Total Expenses', value: fmt(summary.totalExpenses), color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5', icon: '💸' },
              { label: 'Net This Month', value: fmt(summary.balance), color: summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400', border: 'border-white/10', bg: 'bg-white/[0.03]', icon: '📈' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <span className="text-lg">{kpi.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-600 mt-1">{summary.transactionCount} transactions</p>
              </div>
            ))}
          </div>

          {/* Category Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expenses by Category */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Expenses by Category</h2>
              {expenseBreakdown.length === 0 ? (
                <p className="text-xs text-gray-600 py-4 text-center">No expense data yet</p>
              ) : (
                <div className="space-y-3">
                  {expenseBreakdown.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-300">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{cat.percentage}%</span>
                          <span className="text-xs font-semibold text-red-400">{fmt(cat.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500/60 transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Income by Category */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Income by Category</h2>
              {incomeBreakdown.length === 0 ? (
                <p className="text-xs text-gray-600 py-4 text-center">No income data yet</p>
              ) : (
                <div className="space-y-3">
                  {incomeBreakdown.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-300">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{cat.percentage}%</span>
                          <span className="text-xs font-semibold text-emerald-400">{fmt(cat.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60 transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
              <a href="/chat" className="text-xs text-emerald-500 hover:text-emerald-400 transition">
                + Add via chat →
              </a>
            </div>
            {recent.length === 0 ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((tx, i) => (
                      <tr
                        key={tx.id}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                      >
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer Balances */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-sm font-semibold text-white">Customer Balances</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-white/5 px-2 py-1 rounded">Directory</span>
            </div>
            {customers.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-600">No customers yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-600 border-b border-white/5">
                      <th className="text-left px-5 py-3 font-medium">Customer Name</th>
                      <th className="text-right px-5 py-3 font-medium">Total Sales</th>
                      <th className="text-right px-5 py-3 font-medium">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr
                        key={c.id}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                      >
                        <td className="px-5 py-3 text-gray-300 font-medium">
                          {c.name}
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-400">
                          {fmt(c.totalSales)}
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${
                          c.outstandingBalance > 0 ? 'text-amber-400' : 'text-gray-500'
                        }`}>
                          {fmt(c.outstandingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#0a0f0d] px-2 pb-[env(safe-area-inset-bottom)]">
        {[
          { href: '/chat', label: 'Chat', icon: '💬', active: false },
          { href: '/reports', label: 'Reports', icon: '📊', active: true },
          { href: '/settings', label: 'Settings', icon: '⚙', active: false },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 transition ${
              item.active ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
