import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllTransactions } from '@/lib/transactions'
import TransactionsTable from './_components/transactions-table'

export const dynamic = 'force-dynamic'

const navigationItems = [
  { href: '/chat', label: 'Chat', shortLabel: 'CH', icon: '💬', active: false },
  { href: '/reports', label: 'Reports', shortLabel: 'RP', icon: '📊', active: false },
  { href: '/transactions', label: 'Transactions', shortLabel: 'TX', icon: '📋', active: true },
  { href: '/settings', label: 'Settings', shortLabel: 'ST', icon: '⚙', active: false },
]

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const transactions = await getAllTransactions(user.id)
  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User'

  return (
    <div className="flex min-h-screen bg-[#080c0a]">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-white/5 bg-[#0a0f0d] px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <Image src="/fintrabooks-logo.svg" alt="FintraBooks" width={40} height={40} className="h-10 w-10 rounded-lg" />
          <span className="text-sm font-bold text-white">FintraBooks</span>
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                item.active
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{displayName}</p>
              <p className="truncate text-[10px] text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <header className="relative border-b border-white/5 px-6 py-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 opacity-60" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-xs">📋</span>
                <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-500 font-semibold">Transaction Manager</p>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold text-white">All Transactions</h1>
              <p className="mt-1 text-sm text-gray-500">
                {transactions.length} total transactions · Edit or delete any entry inline
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <span>💬</span> Add via Chat
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span>📊</span> Reports
              </Link>
            </div>
          </div>
        </header>

        <div className="p-6">
          <TransactionsTable transactions={transactions} />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#0a0f0d] px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 transition ${
              item.active ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
