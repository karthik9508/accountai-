import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOutAction } from '@/app/actions/auth'
import SettingsForm from './_components/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const meta = user.user_metadata || {}
  const businessProfile = {
    business_name: meta.business_name || '',
    business_address: meta.business_address || '',
    business_contact: meta.business_contact || '',
    business_email: meta.business_email || user.email || '',
  }

  return (
    <div className="flex min-h-screen bg-[#080c0a]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/5 bg-[#0a0f0d] px-4 py-6">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <img src="/fintrabooks-logo.svg" alt="FintraBooks" className="h-10 w-10 rounded-lg" />
          <span className="font-bold text-white text-sm">FintraBooks</span>
        </div>
        <nav className="space-y-1">
          {[
            { href: '/chat', label: 'Chat', icon: '💬', active: false },
            { href: '/reports', label: 'Reports', icon: '📊', active: false },
            { href: '/settings', label: 'Settings', icon: '⚙', active: true },
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
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your business profile and preferences</p>
        </header>

        <div className="p-6 max-w-2xl space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Business Profile</h2>
            <SettingsForm initialData={businessProfile} />
          </div>

          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Account Actions</h2>
            <p className="text-xs text-gray-500 mb-6">Sign out of your account on this device.</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600/20 border border-red-500/30 px-6 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-600/30 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#0a0f0d] px-2 pb-[env(safe-area-inset-bottom)]">
        {[
          { href: '/chat', label: 'Chat', icon: '💬', active: false },
          { href: '/reports', label: 'Reports', icon: '📊', active: false },
          { href: '/settings', label: 'Settings', icon: '⚙', active: true },
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
