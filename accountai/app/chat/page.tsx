import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getChatHistory, getMonthlySummary, getBalance } from '@/lib/transactions'
import { signOutAction } from '@/app/actions/auth'
import ChatWindow from './_components/chat-window'

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
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
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#080c0a]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="text-sm">🤖</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">FintraBooks Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-gray-500">AI-powered · Gemini 1.5 Flash</span>
              </div>
            </div>
          </div>
          <a
            href="/reports"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400 transition"
          >
            📊 Reports
          </a>
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
