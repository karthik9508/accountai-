import { createClient } from '@/lib/supabase/server'
import type { CategoryBreakdown, MonthlySummary, Transaction } from '@/lib/transactions'

export type ReportView = 'month' | 'quarter' | 'year' | 'custom'

type ReportTransactionRow = Pick<
  Transaction,
  | 'id'
  | 'amount'
  | 'type'
  | 'category'
  | 'description'
  | 'customer_name'
  | 'payment_status'
  | 'paid_amount'
  | 'date'
  | 'created_at'
>

type ReportInvoiceRow = {
  id: string
  customer_id: string | null
  total_amount: number | string
  status: 'paid' | 'unpaid' | 'partial'
  due_date: string | null
  created_at: string
}

type ReportCustomerRow = {
  id: string
  name: string
}

export interface ReportFilterInput {
  view?: string
  month?: string
  quarter?: string
  year?: string
  start?: string
  end?: string
}

export interface ReportRange {
  view: ReportView
  startDate: string
  endDate: string
  label: string
  summaryLabel: string
  monthValue: string
  quarterValue: string
  yearValue: string
  customStart: string
  customEnd: string
}

export interface ProfitAndLossReport {
  income: number
  expenses: number
  netProfit: number
  profitMargin: number
  transactionCount: number
}

export interface BalanceSheetReport {
  cashAndBank: number
  accountsReceivable: number
  accountsPayable: number
  totalAssets: number
  totalLiabilities: number
  ownerEquity: number
}

export interface CashFlowReport {
  cashIn: number
  cashOut: number
  netCashFlow: number
  collectionRate: number
}

export interface TrendPoint {
  label: string
  income: number
  expenses: number
  net: number
  cashIn: number
  cashOut: number
}

export interface CollectionsSnapshot {
  outstandingReceivables: number
  outstandingPayables: number
  unpaidInvoiceCount: number
  overdueInvoiceCount: number
  activeCustomerCount: number
  collectionRate: number
}

export interface CustomerReportSummary {
  id: string
  name: string
  totalSales: number
  outstandingBalance: number
}

export interface ReportAnalytics {
  selectedRange: ReportRange
  selectedPeriodSummary: MonthlySummary
  balance: number
  recentTransactions: Transaction[]
  expenseBreakdown: CategoryBreakdown[]
  incomeBreakdown: CategoryBreakdown[]
  profitAndLoss: ProfitAndLossReport
  balanceSheet: BalanceSheetReport
  cashFlow: CashFlowReport
  trend: TrendPoint[]
  collections: CollectionsSnapshot
  customerSummaries: CustomerReportSummary[]
}

function toNumber(value: number | string | null | undefined): number {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function startOfMonth(year: number, month: number): string {
  return `${year}-${pad(month)}-01`
}

function endOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${pad(month)}-${pad(lastDay)}`
}

function quarterToStartMonth(quarter: number): number {
  return (quarter - 1) * 3 + 1
}

function isoDateFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function formatDateLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toMonthInputValue(year: number, month: number): string {
  return `${year}-${pad(month)}`
}

function getQuarterFromMonth(month: number): number {
  return Math.floor((month - 1) / 3) + 1
}

function parseYear(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 9999 ? parsed : fallback
}

function parseQuarter(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : fallback
}

function isValidDateString(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function buildMonthRange(year: number, month: number): ReportRange {
  return {
    view: 'month',
    startDate: startOfMonth(year, month),
    endDate: endOfMonth(year, month),
    label: new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    }),
    summaryLabel: 'This Month',
    monthValue: toMonthInputValue(year, month),
    quarterValue: String(getQuarterFromMonth(month)),
    yearValue: String(year),
    customStart: startOfMonth(year, month),
    customEnd: endOfMonth(year, month),
  }
}

function buildQuarterRange(year: number, quarter: number): ReportRange {
  const startMonth = quarterToStartMonth(quarter)
  const endMonth = startMonth + 2

  return {
    view: 'quarter',
    startDate: startOfMonth(year, startMonth),
    endDate: endOfMonth(year, endMonth),
    label: `Q${quarter} ${year}`,
    summaryLabel: 'This Quarter',
    monthValue: toMonthInputValue(year, startMonth),
    quarterValue: String(quarter),
    yearValue: String(year),
    customStart: startOfMonth(year, startMonth),
    customEnd: endOfMonth(year, endMonth),
  }
}

function buildYearRange(year: number): ReportRange {
  return {
    view: 'year',
    startDate: isoDateFromParts(year, 1, 1),
    endDate: isoDateFromParts(year, 12, 31),
    label: `Annual ${year}`,
    summaryLabel: 'This Year',
    monthValue: `${year}-01`,
    quarterValue: '1',
    yearValue: String(year),
    customStart: isoDateFromParts(year, 1, 1),
    customEnd: isoDateFromParts(year, 12, 31),
  }
}

function buildCustomRange(startDate: string, endDate: string): ReportRange {
  const startYear = Number(startDate.slice(0, 4))
  const startMonth = Number(startDate.slice(5, 7))

  return {
    view: 'custom',
    startDate,
    endDate,
    label: `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`,
    summaryLabel: 'Selected Range',
    monthValue: toMonthInputValue(startYear, startMonth),
    quarterValue: String(getQuarterFromMonth(startMonth)),
    yearValue: String(startYear),
    customStart: startDate,
    customEnd: endDate,
  }
}

export function resolveReportRange(input: ReportFilterInput = {}, now: Date = new Date()): ReportRange {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentQuarter = getQuarterFromMonth(currentMonth)
  const selectedView = input.view

  if (selectedView === 'quarter') {
    const year = parseYear(input.year, currentYear)
    const quarter = parseQuarter(input.quarter, currentQuarter)
    return buildQuarterRange(year, quarter)
  }

  if (selectedView === 'year') {
    const year = parseYear(input.year, currentYear)
    return buildYearRange(year)
  }

  if (selectedView === 'custom' && isValidDateString(input.start) && isValidDateString(input.end)) {
    const startDate = input.start
    const endDate = input.end

    if (startDate <= endDate) {
      return buildCustomRange(startDate, endDate)
    }
  }

  if (selectedView === 'month' && input.month && /^\d{4}-\d{2}$/.test(input.month)) {
    const [yearPart, monthPart] = input.month.split('-')
    const year = parseYear(yearPart, currentYear)
    const month = clamp(Number(monthPart), 1, 12)
    return buildMonthRange(year, month)
  }

  return buildMonthRange(currentYear, currentMonth)
}

function getPaymentStatus(transaction: ReportTransactionRow): 'paid' | 'unpaid' | 'partial' {
  return transaction.payment_status ?? 'paid'
}

function getCashComponent(transaction: ReportTransactionRow): number {
  const amount = toNumber(transaction.amount)
  const paidAmount = toNumber(transaction.paid_amount)
  const status = getPaymentStatus(transaction)

  if (status === 'paid') {
    return amount
  }

  if (status === 'partial') {
    return clamp(paidAmount, 0, amount)
  }

  return 0
}

function getOutstandingComponent(transaction: ReportTransactionRow): number {
  const amount = toNumber(transaction.amount)
  return Math.max(amount - getCashComponent(transaction), 0)
}

function sortTransactions(transactions: ReportTransactionRow[]): ReportTransactionRow[] {
  return [...transactions].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date)
    if (dateCompare !== 0) {
      return dateCompare
    }

    return right.created_at.localeCompare(left.created_at)
  })
}

function normalizeTransactions(transactions: ReportTransactionRow[]): ReportTransactionRow[] {
  return transactions.map((transaction) => ({
    ...transaction,
    amount: toNumber(transaction.amount),
    paid_amount: transaction.paid_amount == null ? null : toNumber(transaction.paid_amount),
  }))
}

function getCreatedDate(value: string): string {
  return value.slice(0, 10)
}

function filterTransactionsByRange(
  transactions: ReportTransactionRow[],
  range: Pick<ReportRange, 'startDate' | 'endDate'>
): ReportTransactionRow[] {
  return transactions.filter(
    (transaction) => transaction.date >= range.startDate && transaction.date <= range.endDate
  )
}

function filterInvoicesByRange(
  invoices: ReportInvoiceRow[],
  range: Pick<ReportRange, 'startDate' | 'endDate'>
): ReportInvoiceRow[] {
  return invoices.filter((invoice) => {
    const createdDate = getCreatedDate(invoice.created_at)
    return createdDate >= range.startDate && createdDate <= range.endDate
  })
}

function buildMonthlySummary(transactions: ReportTransactionRow[]): MonthlySummary {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  return {
    totalIncome: roundCurrency(totalIncome),
    totalExpenses: roundCurrency(totalExpenses),
    balance: roundCurrency(totalIncome - totalExpenses),
    transactionCount: transactions.length,
  }
}

function buildCategoryBreakdown(
  transactions: ReportTransactionRow[],
  type: 'income' | 'expense',
  limit: number
): CategoryBreakdown[] {
  const grouped = new Map<string, { total: number; count: number }>()

  for (const transaction of transactions) {
    if (transaction.type !== type) {
      continue
    }

    const entry = grouped.get(transaction.category) ?? { total: 0, count: 0 }
    entry.total += toNumber(transaction.amount)
    entry.count += 1
    grouped.set(transaction.category, entry)
  }

  const grandTotal = Array.from(grouped.values()).reduce((sum, entry) => sum + entry.total, 0)

  return Array.from(grouped.entries())
    .map(([category, entry]) => ({
      category,
      total: roundCurrency(entry.total),
      count: entry.count,
      percentage: grandTotal > 0 ? Math.round((entry.total / grandTotal) * 100) : 0,
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, limit)
}

function buildProfitAndLoss(transactions: ReportTransactionRow[]): ProfitAndLossReport {
  const summary = buildMonthlySummary(transactions)
  const profitMargin = summary.totalIncome > 0 ? (summary.balance / summary.totalIncome) * 100 : 0

  return {
    income: summary.totalIncome,
    expenses: summary.totalExpenses,
    netProfit: summary.balance,
    profitMargin: Math.round(profitMargin * 10) / 10,
    transactionCount: summary.transactionCount,
  }
}

function buildBalanceSheet(transactions: ReportTransactionRow[]): BalanceSheetReport {
  let cashAndBank = 0
  let accountsReceivable = 0
  let accountsPayable = 0

  for (const transaction of transactions) {
    const cashComponent = getCashComponent(transaction)
    const outstandingComponent = getOutstandingComponent(transaction)

    if (transaction.type === 'income') {
      cashAndBank += cashComponent
      accountsReceivable += outstandingComponent
    } else {
      cashAndBank -= cashComponent
      accountsPayable += outstandingComponent
    }
  }

  const totalAssets = cashAndBank + accountsReceivable
  const totalLiabilities = accountsPayable

  return {
    cashAndBank: roundCurrency(cashAndBank),
    accountsReceivable: roundCurrency(accountsReceivable),
    accountsPayable: roundCurrency(accountsPayable),
    totalAssets: roundCurrency(totalAssets),
    totalLiabilities: roundCurrency(totalLiabilities),
    ownerEquity: roundCurrency(totalAssets - totalLiabilities),
  }
}

function buildCashFlow(transactions: ReportTransactionRow[]): CashFlowReport {
  let cashIn = 0
  let cashOut = 0
  let totalIncome = 0

  for (const transaction of transactions) {
    const amount = toNumber(transaction.amount)
    const cashComponent = getCashComponent(transaction)

    if (transaction.type === 'income') {
      totalIncome += amount
      cashIn += cashComponent
    } else {
      cashOut += cashComponent
    }
  }

  const collectionRate = totalIncome > 0 ? (cashIn / totalIncome) * 100 : 0

  return {
    cashIn: roundCurrency(cashIn),
    cashOut: roundCurrency(cashOut),
    netCashFlow: roundCurrency(cashIn - cashOut),
    collectionRate: Math.round(collectionRate * 10) / 10,
  }
}

function buildMonthTrend(
  transactions: ReportTransactionRow[],
  selectedRange: ReportRange
): TrendPoint[] {
  const points: TrendPoint[] = []
  const endYear = Number(selectedRange.endDate.slice(0, 4))
  const endMonth = Number(selectedRange.endDate.slice(5, 7))

  for (let offset = 5; offset >= 0; offset -= 1) {
    const target = new Date(endYear, endMonth - 1 - offset, 1)
    const year = target.getFullYear()
    const month = target.getMonth() + 1
    const periodTransactions = filterTransactionsByRange(transactions, {
      startDate: startOfMonth(year, month),
      endDate: endOfMonth(year, month),
    })
    const summary = buildMonthlySummary(periodTransactions)
    const cashFlow = buildCashFlow(periodTransactions)

    points.push({
      label: target.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      income: summary.totalIncome,
      expenses: summary.totalExpenses,
      net: summary.balance,
      cashIn: cashFlow.cashIn,
      cashOut: cashFlow.cashOut,
    })
  }

  return points
}

function buildQuarterTrend(
  transactions: ReportTransactionRow[],
  selectedRange: ReportRange
): TrendPoint[] {
  const points: TrendPoint[] = []
  const startYear = Number(selectedRange.startDate.slice(0, 4))
  const selectedStartMonth = Number(selectedRange.startDate.slice(5, 7))

  for (let offset = 3; offset >= 0; offset -= 1) {
    const target = new Date(startYear, selectedStartMonth - 1 - offset * 3, 1)
    const year = target.getFullYear()
    const quarter = getQuarterFromMonth(target.getMonth() + 1)
    const startMonth = quarterToStartMonth(quarter)
    const periodTransactions = filterTransactionsByRange(transactions, {
      startDate: startOfMonth(year, startMonth),
      endDate: endOfMonth(year, startMonth + 2),
    })
    const summary = buildMonthlySummary(periodTransactions)
    const cashFlow = buildCashFlow(periodTransactions)

    points.push({
      label: `Q${quarter} ${year}`,
      income: summary.totalIncome,
      expenses: summary.totalExpenses,
      net: summary.balance,
      cashIn: cashFlow.cashIn,
      cashOut: cashFlow.cashOut,
    })
  }

  return points
}

function buildYearTrend(
  transactions: ReportTransactionRow[],
  selectedRange: ReportRange
): TrendPoint[] {
  const points: TrendPoint[] = []
  const endYear = Number(selectedRange.endDate.slice(0, 4))

  for (let offset = 4; offset >= 0; offset -= 1) {
    const year = endYear - offset
    const periodTransactions = filterTransactionsByRange(transactions, {
      startDate: isoDateFromParts(year, 1, 1),
      endDate: isoDateFromParts(year, 12, 31),
    })
    const summary = buildMonthlySummary(periodTransactions)
    const cashFlow = buildCashFlow(periodTransactions)

    points.push({
      label: String(year),
      income: summary.totalIncome,
      expenses: summary.totalExpenses,
      net: summary.balance,
      cashIn: cashFlow.cashIn,
      cashOut: cashFlow.cashOut,
    })
  }

  return points
}

function buildCustomTrend(
  transactions: ReportTransactionRow[],
  selectedRange: ReportRange
): TrendPoint[] {
  const startYear = Number(selectedRange.startDate.slice(0, 4))
  const startMonth = Number(selectedRange.startDate.slice(5, 7))
  const endYear = Number(selectedRange.endDate.slice(0, 4))
  const endMonth = Number(selectedRange.endDate.slice(5, 7))
  const monthCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1
  const points: TrendPoint[] = []

  for (let offset = 0; offset < monthCount; offset += 1) {
    const target = new Date(startYear, startMonth - 1 + offset, 1)
    const year = target.getFullYear()
    const month = target.getMonth() + 1
    const bucketStart = startOfMonth(year, month)
    const bucketEnd = endOfMonth(year, month)
    const periodTransactions = transactions.filter((transaction) => {
      const effectiveStart = bucketStart < selectedRange.startDate ? selectedRange.startDate : bucketStart
      const effectiveEnd = bucketEnd > selectedRange.endDate ? selectedRange.endDate : bucketEnd
      return transaction.date >= effectiveStart && transaction.date <= effectiveEnd
    })
    const summary = buildMonthlySummary(periodTransactions)
    const cashFlow = buildCashFlow(periodTransactions)

    points.push({
      label: target.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      income: summary.totalIncome,
      expenses: summary.totalExpenses,
      net: summary.balance,
      cashIn: cashFlow.cashIn,
      cashOut: cashFlow.cashOut,
    })
  }

  return points.length > 8 ? points.slice(points.length - 8) : points
}

function buildTrend(
  transactions: ReportTransactionRow[],
  selectedRange: ReportRange
): TrendPoint[] {
  if (selectedRange.view === 'quarter') {
    return buildQuarterTrend(transactions, selectedRange)
  }

  if (selectedRange.view === 'year') {
    return buildYearTrend(transactions, selectedRange)
  }

  if (selectedRange.view === 'custom') {
    return buildCustomTrend(transactions, selectedRange)
  }

  return buildMonthTrend(transactions, selectedRange)
}

function buildCollectionsSnapshot(
  transactions: ReportTransactionRow[],
  invoices: ReportInvoiceRow[]
): CollectionsSnapshot {
  let outstandingReceivables = 0
  let outstandingPayables = 0
  let collectedIncome = 0
  let bookedIncome = 0

  const activeCustomers = new Set<string>()

  for (const transaction of transactions) {
    const amount = toNumber(transaction.amount)
    const cashComponent = getCashComponent(transaction)
    const outstandingComponent = getOutstandingComponent(transaction)

    if (transaction.customer_name) {
      activeCustomers.add(transaction.customer_name.trim().toLowerCase())
    }

    if (transaction.type === 'income') {
      bookedIncome += amount
      collectedIncome += cashComponent
      outstandingReceivables += outstandingComponent
    } else {
      outstandingPayables += outstandingComponent
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const unpaidInvoiceCount = invoices.filter((invoice) => invoice.status !== 'paid').length
  const overdueInvoiceCount = invoices.filter(
    (invoice) => invoice.status !== 'paid' && invoice.due_date && invoice.due_date < today
  ).length

  for (const invoice of invoices) {
    if (invoice.customer_id) {
      activeCustomers.add(invoice.customer_id)
    }
  }

  const collectionRate = bookedIncome > 0 ? (collectedIncome / bookedIncome) * 100 : 0

  return {
    outstandingReceivables: roundCurrency(outstandingReceivables),
    outstandingPayables: roundCurrency(outstandingPayables),
    unpaidInvoiceCount,
    overdueInvoiceCount,
    activeCustomerCount: activeCustomers.size,
    collectionRate: Math.round(collectionRate * 10) / 10,
  }
}

function buildCustomerSummaries(
  customers: ReportCustomerRow[],
  transactions: ReportTransactionRow[],
  invoices: ReportInvoiceRow[]
): CustomerReportSummary[] {
  const customerById = new Map(customers.map((customer) => [customer.id, customer]))
  const customerIdByName = new Map(
    customers.map((customer) => [customer.name.trim().toLowerCase(), customer.id])
  )
  const summaries = new Map<string, CustomerReportSummary>()

  function ensureSummary(key: string, name: string): CustomerReportSummary {
    const existing = summaries.get(key)
    if (existing) {
      return existing
    }

    const summary = {
      id: key,
      name,
      totalSales: 0,
      outstandingBalance: 0,
    }
    summaries.set(key, summary)
    return summary
  }

  for (const transaction of transactions) {
    if (transaction.type !== 'income' || !transaction.customer_name) {
      continue
    }

    const normalizedName = transaction.customer_name.trim().toLowerCase()
    const customerId = customerIdByName.get(normalizedName)
    const key = customerId ?? `name:${normalizedName}`
    const label = customerId ? customerById.get(customerId)?.name ?? transaction.customer_name : transaction.customer_name
    const summary = ensureSummary(key, label)
    summary.totalSales += toNumber(transaction.amount)
  }

  for (const invoice of invoices) {
    if (invoice.status === 'paid' || !invoice.customer_id) {
      continue
    }

    const customer = customerById.get(invoice.customer_id)
    const summary = ensureSummary(invoice.customer_id, customer?.name ?? 'Unknown Customer')
    summary.outstandingBalance += toNumber(invoice.total_amount)
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      totalSales: roundCurrency(summary.totalSales),
      outstandingBalance: roundCurrency(summary.outstandingBalance),
    }))
    .sort((left, right) => {
      if (right.totalSales !== left.totalSales) {
        return right.totalSales - left.totalSales
      }

      return right.outstandingBalance - left.outstandingBalance
    })
}

export async function getReportAnalytics(
  userId: string,
  filterInput: ReportFilterInput = {}
): Promise<ReportAnalytics> {
  const supabase = await createClient()
  const now = new Date()
  const selectedRange = resolveReportRange(filterInput, now)

  const [{ data: transactionsData }, { data: invoicesData }, { data: customersData }] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, amount, type, category, description, customer_name, payment_status, paid_amount, date, created_at'
      )
      .eq('user_id', userId),
    supabase
      .from('invoices')
      .select('id, customer_id, total_amount, status, due_date, created_at')
      .eq('user_id', userId),
    supabase
      .from('customers')
      .select('id, name')
      .eq('user_id', userId),
  ])

  const transactions = normalizeTransactions((transactionsData ?? []) as ReportTransactionRow[])
  const invoices = (invoicesData ?? []) as ReportInvoiceRow[]
  const customers = (customersData ?? []) as ReportCustomerRow[]

  const sortedTransactions = sortTransactions(transactions)
  const filteredTransactions = filterTransactionsByRange(sortedTransactions, selectedRange)
  const filteredInvoices = filterInvoicesByRange(invoices, selectedRange)

  const balance = sortedTransactions.reduce((sum, transaction) => {
    const signedAmount =
      transaction.type === 'income' ? toNumber(transaction.amount) : -toNumber(transaction.amount)
    return sum + signedAmount
  }, 0)

  return {
    selectedRange,
    selectedPeriodSummary: buildMonthlySummary(filteredTransactions),
    balance: roundCurrency(balance),
    recentTransactions: filteredTransactions.slice(0, 15) as Transaction[],
    expenseBreakdown: buildCategoryBreakdown(filteredTransactions, 'expense', 6),
    incomeBreakdown: buildCategoryBreakdown(filteredTransactions, 'income', 6),
    profitAndLoss: buildProfitAndLoss(filteredTransactions),
    balanceSheet: buildBalanceSheet(filteredTransactions),
    cashFlow: buildCashFlow(filteredTransactions),
    trend: buildTrend(sortedTransactions, selectedRange),
    collections: buildCollectionsSnapshot(filteredTransactions, filteredInvoices),
    customerSummaries: buildCustomerSummaries(customers, filteredTransactions, filteredInvoices),
  }
}
