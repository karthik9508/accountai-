import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getChatHistory, getMonthlySummary, getBalance } from '@/lib/transactions'
import { clearChatAction } from '@/app/actions/chat'
import ChatWindow from './_components/chat-window'
import ClearChatButton from './_components/clear-chat-button'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [messages, summary, balance] = await Promise.all([
    getChatHistory(user.id, 50),
    getMonthlySummary(user.id),
    getBalance(user.id),
  ])

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User'

  const businessProfile = {
    business_name: user.user_metadata?.business_name,
    business_address: user.user_metadata?.business_address,
    business_contact: user.user_metadata?.business_contact,
    business_email: user.user_metadata?.business_email,
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="flex h-screen bg-[#080c0a] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-[#0a0f0d]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
          <img src="/fintrabooks-logo.svg" alt="FintraBooks" className="h-10 w-10 rounded-lg" />
          <span className="font-bold text-white text-sm tracking-tight">FintraBooks</span>
        </div>

        {/* Financial Summary */}
        <div className="p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-1">
            This Month
          </p>

          {[
            { label: 'Income', value: fmt(summary.totalIncome), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Expenses', value: fmt(summary.totalExpenses), color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Net Balance', value: fmt(balance), color: balance >= 0 ? 'text-emerald-400' : 'text-red-400', bg: balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl p-3 ${item.bg}`}>
              <p className="text-[10px] text-gray-500 mb-1">{item.label}</p>
              <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2 space-y-1">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Navigation
          </p>
          {[
            { href: '/chat', label: 'Chat', icon: '💬', active: true },
            { href: '/reports', label: 'Reports', icon: '📊', active: false },
            { href: '/dashboard', label: 'Dashboard', icon: '◈', active: false },
            { href: '/settings', label: 'Settings', icon: '⚙', active: false },
          ].map((item) => (
            <a
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
            </a>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/5">
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

      {/* ── Chat area ─────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0 mb-14 md:mb-0">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#080c0a]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="text-sm">🤖</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">FintraBooks Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-gray-500">AI-powered</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClearChatButton clearAction={clearChatAction} />
            <a
              href="/reports"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400 transition"
            >
              📊 Reports
            </a>
          </div>
        </div>

        {/* Chat window — client component */}
        <ChatWindow
          initialMessages={messages}
          userName={displayName}
          businessProfile={businessProfile}
        />
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#0a0f0d] px-2 pb-[env(safe-area-inset-bottom)]">
        {[
          { href: '/chat', label: 'Chat', icon: '💬', active: true },
          { href: '/reports', label: 'Reports', icon: '📊', active: false },
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
