import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getReportAnalytics,
  type ReportFilterInput,
  type ReportRange,
  type ReportView,
} from '@/lib/reports'
import { createClient } from '@/lib/supabase/server'
import { RecentTransactionsTable } from './_components/recent-transactions-table'

const navigationItems = [
  { href: '/chat', label: 'Chat', shortLabel: 'CH', active: false },
  { href: '/reports', label: 'Reports', shortLabel: 'RP', active: true },
  { href: '/settings', label: 'Settings', shortLabel: 'ST', active: false },
]

type RawSearchParams = Record<string, string | string[] | undefined>

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatSignedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value))
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function toneForValue(value: number) {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-300'
}

function getFirstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function toFilterInput(searchParams: RawSearchParams | undefined): ReportFilterInput {
  return {
    view: getFirstValue(searchParams?.view),
    month: getFirstValue(searchParams?.month),
    quarter: getFirstValue(searchParams?.quarter),
    year: getFirstValue(searchParams?.year),
    start: getFirstValue(searchParams?.start),
    end: getFirstValue(searchParams?.end),
  }
}

function buildReportHref(view: ReportView, range: ReportRange): string {
  const params = new URLSearchParams({ view })

  if (view === 'month') {
    params.set('month', range.monthValue)
  } else if (view === 'quarter') {
    params.set('quarter', range.quarterValue)
    params.set('year', range.yearValue)
  } else if (view === 'year') {
    params.set('year', range.yearValue)
  } else {
    params.set('start', range.customStart)
    params.set('end', range.customEnd)
  }

  return `/reports?${params.toString()}`
}

function getTrendDescription(view: ReportView) {
  if (view === 'quarter') {
    return 'Quarter-by-quarter movement across the recent 4 quarters.'
  }

  if (view === 'year') {
    return 'Yearly comparison across the recent 5 years.'
  }

  if (view === 'custom') {
    return 'Monthly buckets inside your selected custom period.'
  }

  return 'Month-by-month movement across the recent 6 months.'
}

function SidebarNav() {
  return (
    <aside className="hidden w-60 flex-col border-r border-white/5 bg-[#0a0f0d] px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <Image
          src="/fintrabooks-logo.svg"
          alt="FintraBooks"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg"
        />
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
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-bold tracking-[0.2em]">
              {item.shortLabel}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#0a0f0d] px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 transition ${
            item.active ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-bold tracking-[0.2em]">
            {item.shortLabel}
          </span>
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

function HeroMetric({
  label,
  value,
  hint,
  tone = 'text-white',
  icon,
  accentColor = 'emerald',
}: {
  label: string
  value: string
  hint: string
  tone?: string
  icon?: string
  accentColor?: 'emerald' | 'red' | 'cyan' | 'amber'
}) {
  const borderMap = {
    emerald: 'border-emerald-500/15 hover:border-emerald-500/30',
    red: 'border-red-500/15 hover:border-red-500/30',
    cyan: 'border-cyan-500/15 hover:border-cyan-500/30',
    amber: 'border-amber-500/15 hover:border-amber-500/30',
  }
  const glowMap = {
    emerald: 'from-emerald-500/5 to-transparent',
    red: 'from-red-500/5 to-transparent',
    cyan: 'from-cyan-500/5 to-transparent',
    amber: 'from-amber-500/5 to-transparent',
  }
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${borderMap[accentColor]} bg-white/[0.03] p-5 transition-all duration-300 hover:bg-white/[0.05] hover:shadow-lg`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${glowMap[accentColor]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{label}</p>
        </div>
        <p className={`mt-3 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
        <p className="mt-1.5 text-xs text-gray-600">{hint}</p>
      </div>
    </div>
  )
}

function StatementRow({
  label,
  value,
  tone = 'text-gray-200',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  )
}

function SnapshotCard({
  label,
  value,
  note,
  tone = 'text-white',
  icon,
}: {
  label: string
  value: string
  note: string
  tone?: string
  icon?: string
}) {
  return (
    <div className="group rounded-2xl border border-white/5 bg-[#0f1512] p-4 transition-all duration-300 hover:border-white/10 hover:bg-[#111a16]">
      <div className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-600">{note}</p>
    </div>
  )
}

function FilterPanel({ range }: { range: ReportRange }) {
  const tabs: Array<{ view: ReportView; label: string }> = [
    { view: 'month', label: 'Month Wise' },
    { view: 'quarter', label: 'Quarterly' },
    { view: 'year', label: 'Annual' },
    { view: 'custom', label: 'Customised' },
  ]

  return (
    <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-500">Data Filter</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{range.label}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Switch reports between month-wise, quarterly, annual, and custom ranges.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.view}
              href={buildReportHref(tab.view, range)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                range.view === tab.view
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-white/[0.03] text-gray-400 ring-1 ring-white/10 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/5 bg-[#0d120f] p-4">
        {range.view === 'month' && (
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            <input type="hidden" name="view" value="month" />
            <label className="text-sm text-gray-400">
              Month
              <input
                type="month"
                name="month"
                defaultValue={range.monthValue}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
            >
              Apply Filter
            </button>
          </form>
        )}

        {range.view === 'quarter' && (
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="get">
            <input type="hidden" name="view" value="quarter" />
            <label className="text-sm text-gray-400">
              Quarter
              <select
                name="quarter"
                defaultValue={range.quarterValue}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/40"
              >
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </label>
            <label className="text-sm text-gray-400">
              Year
              <input
                type="number"
                name="year"
                min="2000"
                max="9999"
                defaultValue={range.yearValue}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
            >
              Apply Filter
            </button>
          </form>
        )}

        {range.view === 'year' && (
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            <input type="hidden" name="view" value="year" />
            <label className="text-sm text-gray-400">
              Year
              <input
                type="number"
                name="year"
                min="2000"
                max="9999"
                defaultValue={range.yearValue}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
            >
              Apply Filter
            </button>
          </form>
        )}

        {range.view === 'custom' && (
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="get">
            <input type="hidden" name="view" value="custom" />
            <label className="text-sm text-gray-400">
              Start Date
              <input
                type="date"
                name="start"
                defaultValue={range.customStart}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/40"
              />
            </label>
            <label className="text-sm text-gray-400">
              End Date
              <input
                type="date"
                name="end"
                defaultValue={range.customEnd}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
            >
              Apply Filter
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<RawSearchParams> | RawSearchParams
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedSearchParams = await Promise.resolve(searchParams)
  const filters = toFilterInput(resolvedSearchParams)
  const analytics = await getReportAnalytics(user.id, filters)

  const {
    selectedRange,
    selectedPeriodSummary,
    balance,
    expenseBreakdown,
    incomeBreakdown,
    recentTransactions,
    profitAndLoss,
    balanceSheet,
    cashFlow,
    trend,
    collections,
    customerSummaries,
  } = analytics

  const trendScale = Math.max(
    1,
    ...trend.map((point) =>
      Math.max(point.income, point.expenses, Math.abs(point.net), point.cashIn, point.cashOut)
    )
  )
  const insightPrompt = encodeURIComponent(
    `Review my ${selectedRange.label} profit and loss, cash flow, receivables, payables, and overdue risk.`
  )

  return (
    <div className="flex min-h-screen bg-[#080c0a]">
      <SidebarNav />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <header className="relative border-b border-white/5 px-6 py-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 opacity-60" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-xs">📊</span>
                <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-500 font-semibold">Report Center</p>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold text-white">Financial Reports</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                  {selectedRange.label}
                </span>
                <span className="hidden sm:inline text-gray-700">|</span>
                <span>Balance: <span className={`font-semibold ${toneForValue(balance)}`}>{formatCurrency(balance)}</span></span>
                <span className="hidden sm:inline text-gray-700">|</span>
                <span>Cash: <span className={`font-semibold ${toneForValue(balanceSheet.cashAndBank)}`}>{formatCurrency(balanceSheet.cashAndBank)}</span></span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/chat?prompt=${insightPrompt}`}
                className="group inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <span className="text-base">🤖</span>
                Ask AI for analysis
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="text-base">➕</span>
                Add transaction
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <FilterPanel range={selectedRange} />

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric
              label={`${selectedRange.summaryLabel} Income`}
              value={formatCurrency(selectedPeriodSummary.totalIncome)}
              hint={`${profitAndLoss.transactionCount} entries in this range`}
              tone="text-emerald-400"
              icon="💰"
              accentColor="emerald"
            />
            <HeroMetric
              label={`${selectedRange.summaryLabel} Expenses`}
              value={formatCurrency(selectedPeriodSummary.totalExpenses)}
              hint="Accrual-based expense total"
              tone="text-red-400"
              icon="💸"
              accentColor="red"
            />
            <HeroMetric
              label="Net Profit"
              value={formatSignedCurrency(profitAndLoss.netProfit)}
              hint={`Profit margin ${formatPercent(profitAndLoss.profitMargin)}`}
              tone={toneForValue(profitAndLoss.netProfit)}
              icon="📈"
              accentColor={profitAndLoss.netProfit >= 0 ? 'emerald' : 'red'}
            />
            <HeroMetric
              label="Cash Collected"
              value={formatCurrency(cashFlow.cashIn)}
              hint={`Collection rate ${formatPercent(cashFlow.collectionRate)}`}
              tone="text-cyan-400"
              icon="🏦"
              accentColor="cyan"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Profit &amp; Loss</h2>
                  <p className="mt-1 text-xs text-gray-500">Performance for the selected reporting period.</p>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                  P&amp;L
                </span>
              </div>

              <StatementRow
                label="Operating income"
                value={formatCurrency(profitAndLoss.income)}
                tone="text-emerald-400"
              />
              <StatementRow
                label="Operating expenses"
                value={formatCurrency(profitAndLoss.expenses)}
                tone="text-red-400"
              />
              <StatementRow
                label="Net profit"
                value={formatSignedCurrency(profitAndLoss.netProfit)}
                tone={toneForValue(profitAndLoss.netProfit)}
              />
              <StatementRow
                label="Profit margin"
                value={formatPercent(profitAndLoss.profitMargin)}
                tone={toneForValue(profitAndLoss.profitMargin)}
              />
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Balance Sheet</h2>
                  <p className="mt-1 text-xs text-gray-500">Snapshot derived from the filtered report window.</p>
                </div>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  B/S
                </span>
              </div>

              <StatementRow
                label="Cash and bank"
                value={formatCurrency(balanceSheet.cashAndBank)}
                tone={toneForValue(balanceSheet.cashAndBank)}
              />
              <StatementRow
                label="Accounts receivable"
                value={formatCurrency(balanceSheet.accountsReceivable)}
                tone="text-cyan-300"
              />
              <StatementRow
                label="Total assets"
                value={formatCurrency(balanceSheet.totalAssets)}
                tone="text-white"
              />
              <StatementRow
                label="Accounts payable"
                value={formatCurrency(balanceSheet.totalLiabilities)}
                tone="text-orange-300"
              />
              <StatementRow
                label="Owner equity"
                value={formatSignedCurrency(balanceSheet.ownerEquity)}
                tone={toneForValue(balanceSheet.ownerEquity)}
              />
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Cash Flow</h2>
                  <p className="mt-1 text-xs text-gray-500">Cash movement based on paid amounts in this filter.</p>
                </div>
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  CF
                </span>
              </div>

              <StatementRow label="Cash in" value={formatCurrency(cashFlow.cashIn)} tone="text-emerald-400" />
              <StatementRow label="Cash out" value={formatCurrency(cashFlow.cashOut)} tone="text-red-400" />
              <StatementRow
                label="Net cash flow"
                value={formatSignedCurrency(cashFlow.netCashFlow)}
                tone={toneForValue(cashFlow.netCashFlow)}
              />
              <StatementRow
                label="Cash collection rate"
                value={formatPercent(cashFlow.collectionRate)}
                tone="text-cyan-300"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Trend Overview</h2>
                  <p className="mt-1 text-xs text-gray-500">{getTrendDescription(selectedRange.view)}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  Trend
                </span>
              </div>

              <div className="space-y-4">
                {trend.map((point) => (
                  <div key={point.label} className="rounded-2xl border border-white/5 bg-[#0d120f] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{point.label}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Income {formatCurrency(point.income)} | Expense {formatCurrency(point.expenses)} | Cash in{' '}
                          {formatCurrency(point.cashIn)}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${toneForValue(point.net)}`}>
                        Net {formatSignedCurrency(point.net)}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Income</span>
                          <span>{formatCurrency(point.income)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-emerald-500/70"
                            style={{ width: `${Math.max((point.income / trendScale) * 100, 4)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Expenses</span>
                          <span>{formatCurrency(point.expenses)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-red-500/70"
                            style={{ width: `${Math.max((point.expenses / trendScale) * 100, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Working Capital Snapshot</h2>
                  <p className="mt-1 text-xs text-gray-500">Collections and dues inside the selected filter.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                  Ops
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SnapshotCard
                  label="Receivables"
                  value={formatCurrency(collections.outstandingReceivables)}
                  note="Money still expected from customers"
                  tone="text-cyan-300"
                  icon="📥"
                />
                <SnapshotCard
                  label="Payables"
                  value={formatCurrency(collections.outstandingPayables)}
                  note="Bills and purchases not fully paid yet"
                  tone="text-orange-300"
                  icon="📤"
                />
                <SnapshotCard
                  label="Unpaid Invoices"
                  value={String(collections.unpaidInvoiceCount)}
                  note={`${collections.overdueInvoiceCount} currently overdue`}
                  tone={collections.overdueInvoiceCount > 0 ? 'text-amber-300' : 'text-white'}
                  icon="📄"
                />
                <SnapshotCard
                  label="Customers"
                  value={String(collections.activeCustomerCount)}
                  note="Customers active in this filter"
                  icon="👥"
                />
                <SnapshotCard
                  label="Collection Rate"
                  value={formatPercent(collections.collectionRate)}
                  note="Cash collected versus booked income"
                  tone={toneForValue(collections.collectionRate - 70)}
                  icon="📊"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Expenses by Category</h2>
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  {selectedRange.label}
                </span>
              </div>

              {expenseBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-600">No expense data for this filter.</p>
              ) : (
                <div className="space-y-3">
                  {expenseBreakdown.map((category) => (
                    <div key={category.category}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-gray-300">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{category.percentage}%</span>
                          <span className="text-xs font-semibold text-red-400">
                            {formatCurrency(category.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-red-500/60"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Income by Category</h2>
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  {selectedRange.label}
                </span>
              </div>

              {incomeBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-600">No income data for this filter.</p>
              ) : (
                <div className="space-y-3">
                  {incomeBreakdown.map((category) => (
                    <div key={category.category}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-gray-300">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{category.percentage}%</span>
                          <span className="text-xs font-semibold text-emerald-400">
                            {formatCurrency(category.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <RecentTransactionsTable initialRecent={recentTransactions} />

          <section className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">👥</span>
                  <h2 className="text-sm font-semibold text-white">Customer Balances</h2>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Customer sales and outstanding balances for the selected report range.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                {customerSummaries.length} found
              </span>
            </div>

            {customerSummaries.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                  <span className="text-xl">👤</span>
                </div>
                <p className="text-sm text-gray-500">No customer activity for this filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total Sales</th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Outstanding</th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerSummaries.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className={`group border-b border-white/[0.03] transition-colors duration-200 hover:bg-white/[0.03] ${
                          index % 2 === 0 ? '' : 'bg-white/[0.01]'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                              {customer.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-300">{customer.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-emerald-400">
                          {formatCurrency(customer.totalSales)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-bold tabular-nums ${
                            customer.outstandingBalance > 0 ? 'text-amber-400' : 'text-gray-600'
                          }`}
                        >
                          {formatCurrency(customer.outstandingBalance)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            customer.outstandingBalance > 0
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {customer.outstandingBalance > 0 ? '⏳ Due' : '✅ Clear'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
