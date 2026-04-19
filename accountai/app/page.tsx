import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Authenticated users go straight to chat
  if (user) redirect('/chat')

  // Unauthenticated users see the landing page
  return (
    <div className="flex min-h-screen flex-col bg-[#080c0a] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-emerald-600/5 blur-[100px]" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/40">
            <svg className="h-4.5 w-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">AccountAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">AI-Powered Accounting</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight max-w-3xl">
          Your finances,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            automated
          </span>
          {' '}by AI
        </h1>

        <p className="mt-5 text-base md:text-lg text-gray-400 max-w-lg leading-relaxed">
          Just tell AccountAI what you spent or earned — in plain language. We handle the rest: parsing, categorizing, and reporting.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-500 transition active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            Start Free →
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:border-white/20 transition"
          >
            Sign In
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            {
              icon: '⚡',
              title: 'Natural Language Input',
              desc: 'Say "spent ₹500 on groceries" and we parse it into a structured transaction.',
            },
            {
              icon: '📊',
              title: 'Instant Reports',
              desc: 'P&L, category breakdown, and balance summaries — generated in real-time.',
            },
            {
              icon: '🔒',
              title: 'Secure & Private',
              desc: 'Row-level security ensures only you can see your financial data.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-left hover:border-emerald-500/20 transition"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-6 md:px-12 w-full max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">How it works</h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-lg">Three simple steps to put your accounting on autopilot.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />
          
          {[
            { step: '01', title: 'Chat Naturally', desc: 'Type or speak your transaction details. "Spent ₹5000 on Uber" or "Received ₹10000 from Client X".' },
            { step: '02', title: 'AI Processing', desc: 'Our advanced AI instantly parses, categorizes, and structures the data without manual entry.' },
            { step: '03', title: 'Instant Clarity', desc: 'Your dashboard, P&L, and balance sheets are updated in real-time. Ready when you are.' }
          ].map((s, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#080c0a] border border-emerald-500/20 flex items-center justify-center text-2xl font-bold text-emerald-400 mb-6 z-10 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                {s.step}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
              <p className="text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="relative z-10 py-24 px-6 md:px-12 w-full max-w-7xl mx-auto space-y-32">
        {/* Feature 1 */}
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1">
              <span className="text-xs font-medium text-emerald-400">Professional Invoicing</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">Create & track invoices in seconds.</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Generate stunning, professional PDF invoices directly from your parsed transactions. Keep track of what&apos;s paid, partially paid, or overdue with ease.
            </p>
            <ul className="space-y-3 pt-4">
              {['Auto-generated from chat', 'Beautiful PDF formatting', 'Real-time status tracking'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full aspect-square md:aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition duration-500" />
            <div className="w-full h-full rounded-xl bg-[#0a0f0c] border border-white/5 shadow-2xl flex flex-col items-center justify-center p-8 text-center relative z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-white font-medium text-lg">Invoice #INV-2026-001</p>
              <p className="text-gray-500 text-sm mt-2">Generated automatically via AI</p>
              <div className="mt-6 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">Status: Paid</div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-24">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1">
              <span className="text-xs font-medium text-emerald-400">Financial Insights</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">Your business health, visualized.</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              No more complex spreadsheets. Get instant, beautiful reports on your Profit & Loss, cash flow, and category breakdowns. Make informed decisions faster.
            </p>
            <ul className="space-y-3 pt-4">
              {['Live dashboard updates', 'Visual charts & graphs', 'Exportable statements'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full aspect-square md:aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-bl from-white/5 to-transparent p-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition duration-500" />
            <div className="w-full h-full rounded-xl bg-[#0a0f0c] border border-white/5 shadow-2xl p-6 flex flex-col relative z-10">
              <div className="h-8 w-1/3 bg-white/10 rounded-md mb-6" />
              <div className="flex gap-4 mb-8">
                <div className="h-24 flex-1 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-lg border border-emerald-500/10" />
                <div className="h-32 flex-1 bg-gradient-to-t from-emerald-500/30 to-transparent rounded-lg border border-emerald-500/20" />
                <div className="h-20 flex-1 bg-gradient-to-t from-emerald-500/10 to-transparent rounded-lg border border-emerald-500/5" />
              </div>
              <div className="space-y-3 mt-auto">
                <div className="h-4 w-full bg-white/5 rounded-full" />
                <div className="h-4 w-5/6 bg-white/5 rounded-full" />
                <div className="h-4 w-4/6 bg-white/5 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-24 px-6 md:px-12 w-full max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Loved by founders</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "AccountAI completely changed how I manage my freelance business. I just text my expenses on the go and it's perfectly categorized.", author: "Sarah Jenkins", role: "Freelance Designer" },
            { quote: "The invoice generation alone is worth it. What used to take me hours now happens instantly from a simple prompt.", author: "Michael Chen", role: "Agency Owner" },
            { quote: "Finally, accounting software that doesn't feel like a spreadsheet from 1995. The AI is incredibly accurate.", author: "Emma Davis", role: "Startup Founder" }
          ].map((t, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition duration-300">
              <div className="text-emerald-500 mb-6">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">&quot;{t.quote}&quot;</p>
              <div>
                <p className="text-white font-bold">{t.author}</p>
                <p className="text-emerald-500/70 text-sm">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-emerald-900/20 to-[#080c0a] border border-emerald-500/20 rounded-3xl p-12 md:p-20 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[500px] max-h-[500px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">Ready to put your accounting on autopilot?</h2>
            <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">Join thousands of modern businesses using AccountAI to save time, reduce errors, and focus on growth.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
              >
                Get Started for Free
              </Link>
              <span className="text-gray-500 text-sm sm:ml-4">No credit card required.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-gray-700">
        © 2026 AccountAI — Built with Next.js & Supabase
      </footer>
    </div>
  )
}
