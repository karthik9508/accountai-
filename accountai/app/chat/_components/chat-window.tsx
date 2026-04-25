'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ChatMessage } from '@/lib/transactions'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

interface PendingTx {
  amount: number
  type: 'income' | 'expense'
  category: string
  description?: string
  date?: string
  customer_name?: string | null
  payment_status?: 'paid' | 'unpaid' | 'partial'
  paid_amount?: number | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    intent?: string
    imageBase64?: string
    mimeType?: string
    hasAttachment?: boolean
    transaction?: {
      id: string
      amount: number
      type: 'income' | 'expense'
      category: string
      description?: string
      date: string
      payment_status?: 'paid' | 'unpaid' | 'partial'
      paid_amount?: number | null
    } | null
    pendingTransaction?: PendingTx | null
    invoiceData?: any | null
  } | null
  // client-side pending state
  pendingTx?: PendingTx | null
  pendingStatus?: 'pending' | 'accepted' | 'declined' | 'editing'
  // invoice prompt state
  invoicePrompt?: 'asking' | 'generating' | 'done' | null
  invoiceTransactionId?: string | null
  invoiceCustomerName?: string | null
  created_at: string
}

interface Props {
  initialMessages: ChatMessage[]
  userName: string
  businessProfile?: {
    business_name?: string
    business_address?: string
    business_contact?: string
    business_email?: string
  }
}

const SUGGESTIONS = [
  '💸 I spent ₹500 on groceries',
  '💰 Received ₹50,000 salary',
  '📈 Sales to Ravi ₹10,000',
  '📊 Show my balance',
  '📈 Show this month\'s report',
  '📝 Statement for Ravi',
]

const CATEGORIES = [
  'Sales', 'Purchase', 'Groceries', 'Food & Dining', 'Transport', 'Salary', 'Freelance',
  'Shopping', 'Utilities', 'Healthcare', 'Entertainment', 'Education',
  'Rent', 'Investment', 'Transfer', 'Other',
]

function formatMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

/* ── Confirmed transaction card (already saved) ── */
function TransactionCard({ tx }: { tx: PendingTx & { id?: string } }) {
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold text-base ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {tx.type.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1 text-gray-400">
        <div className="flex justify-between">
          <span className="text-gray-600">Category</span>
          <div className="flex items-center gap-2">
            <span>{tx.category}</span>
            {(tx.category === 'Sales' || tx.category === 'Purchase') && tx.payment_status && (
              <span className={`rounded px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider ${
                tx.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                tx.payment_status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {tx.payment_status}
              </span>
            )}
          </div>
        </div>
        {tx.date && <div className="flex justify-between"><span className="text-gray-600">Date</span><span>{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
        {tx.payment_status === 'partial' && tx.paid_amount != null && (
          <>
            <div className="flex justify-between"><span className="text-gray-600">Paid Amount</span><span className="text-emerald-400 font-medium">{fmt(tx.paid_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Outstanding</span><span className="text-amber-400 font-medium">{fmt(tx.amount - tx.paid_amount)}</span></div>
          </>
        )}
        {tx.description && (
          <div className="flex justify-between"><span className="text-gray-600">Note</span><span className="max-w-[140px] truncate text-right">{tx.description}</span></div>
        )}
      </div>
    </div>
  )
}

/* ── Pending transaction card with Accept / Decline / Edit ── */
function PendingTransactionCard({
  tx, status, onAccept, onDecline, onEdit,
}: {
  tx: PendingTx
  status: 'pending' | 'accepted' | 'declined' | 'editing'
  onAccept: (editedTx: PendingTx) => void
  onDecline: () => void
  onEdit: () => void
}) {
  const [editData, setEditData] = useState<PendingTx>({ ...tx })

  // Already resolved
  if (status === 'accepted') {
    return (
      <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
          <span>✅</span> Transaction Saved
        </div>
        <div className="text-gray-400 space-y-0.5">
          <div className="flex items-center gap-2">
            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)} · {tx.category}
            {(tx.category === 'Sales' || tx.category === 'Purchase') && tx.payment_status && (
              <span className={`rounded px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider ${
                tx.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                tx.payment_status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {tx.payment_status}
              </span>
            )}
          </div>
          {tx.payment_status === 'partial' && tx.paid_amount != null && (
            <div className="text-[11px] mt-1 text-gray-500">
              Paid: <span className="text-emerald-400">{fmt(tx.paid_amount)}</span> | Outstanding: <span className="text-amber-400">{fmt(tx.amount - tx.paid_amount)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (status === 'declined') {
    return (
      <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <span>❌</span> Transaction Discarded
        </div>
      </div>
    )
  }

  if (status === 'editing') {
    return (
      <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2.5">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-1">
          <span>✏️</span> Edit Transaction
        </div>

        {/* Amount */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Amount (₹)</label>
          <input
            type="number"
            value={editData.amount ?? ''}
            onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Type</label>
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setEditData({ ...editData, type: t })}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                  editData.type === t
                    ? t === 'income'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                {t === 'income' ? '💰 Income' : '💸 Expense'}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Category</label>
          <select
            value={editData.category}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#111815] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Payment Status (Only for Sales/Purchase) */}
        {(editData.category === 'Sales' || editData.category === 'Purchase') && (
          <>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Payment Status</label>
              <select
                value={editData.payment_status || 'paid'}
                onChange={(e) => setEditData({ ...editData, payment_status: e.target.value as any })}
                className="w-full rounded-lg border border-white/10 bg-[#111815] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
              >
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            {editData.payment_status === 'partial' && (
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Paid Amount (₹)</label>
                <input
                  type="number"
                  value={editData.paid_amount ?? ''}
                  onChange={(e) => setEditData({ ...editData, paid_amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
                />
              </div>
            )}
          </>
        )}

        {/* Description */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Description</label>
          <input
            type="text"
            value={editData.description ?? ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Date</label>
          <input
            type="date"
            value={editData.date ?? ''}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onAccept(editData)}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition active:scale-[0.98]"
          >
            ✅ Save
          </button>
          <button
            onClick={onDecline}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 py-2 text-xs font-semibold text-gray-400 hover:bg-white/10 transition active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // status === 'pending' — show card with action buttons
  return (
    <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
        <span>⏳</span> Pending Confirmation
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold text-base ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {tx.type.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1 text-gray-400 mb-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Category</span>
          <div className="flex items-center gap-2">
            <span>{tx.category}</span>
            {(tx.category === 'Sales' || tx.category === 'Purchase') && tx.payment_status && (
              <span className={`rounded px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider ${
                tx.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                tx.payment_status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {tx.payment_status}
              </span>
            )}
          </div>
        </div>
        {tx.date && <div className="flex justify-between"><span className="text-gray-600">Date</span><span>{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
        {tx.payment_status === 'partial' && tx.paid_amount != null && (
          <>
            <div className="flex justify-between"><span className="text-gray-600">Paid Amount</span><span className="text-emerald-400 font-medium">{fmt(tx.paid_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Outstanding</span><span className="text-amber-400 font-medium">{fmt(tx.amount - tx.paid_amount)}</span></div>
          </>
        )}
        {tx.description && (
          <div className="flex justify-between"><span className="text-gray-600">Note</span><span className="max-w-[140px] truncate text-right">{tx.description}</span></div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(tx)}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition active:scale-[0.98]"
        >
          ✅ Accept
        </button>
        <button
          onClick={onEdit}
          className="flex-1 rounded-lg bg-amber-600/80 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition active:scale-[0.98]"
        >
          ✏️ Edit
        </button>
        <button
          onClick={onDecline}
          className="flex-1 rounded-lg bg-white/5 border border-white/10 py-2 text-xs font-semibold text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition active:scale-[0.98]"
        >
          ❌ Decline
        </button>
      </div>
    </div>
  )
}

/* ── Invoice Prompt Card ── */
function InvoicePromptCard({
  status, onGenerate, onSkip,
}: {
  status: 'asking' | 'generating' | 'done'
  onGenerate: () => void
  onSkip: () => void
}) {
  if (status === 'done') {
    return (
      <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
          <span>📄</span> Invoice Generated — Check Downloads
        </div>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <div className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
        <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating invoice...
        </div>
      </div>
    )
  }
  return (
    <div className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
      <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-2">
        <span>📄</span> Generate invoice for this sale?
      </div>
      <div className="flex gap-2">
        <button onClick={onGenerate}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition active:scale-[0.98]">
          📄 Yes, Generate
        </button>
        <button onClick={onSkip}
          className="flex-1 rounded-lg bg-white/5 border border-white/10 py-2 text-xs font-semibold text-gray-400 hover:bg-white/10 transition active:scale-[0.98]">
          Skip
        </button>
      </div>
    </div>
  )
}

/* ── Retrieved Invoice Card ── */
function RetrievedInvoiceCard({ invoiceData, businessProfile }: { invoiceData: any, businessProfile?: any }) {
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-base text-blue-400">
          {invoiceData.invoice_number}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          invoiceData.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
          invoiceData.status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {invoiceData.status.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1 text-gray-400 mb-3">
        <div className="flex justify-between"><span className="text-gray-600">Customer</span><span className="font-medium text-gray-300">{invoiceData.customer_name}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Amount</span><span>{fmt(invoiceData.amount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium text-gray-300">{fmt(invoiceData.total_amount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Due</span><span>{invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'On receipt'}</span></div>
      </div>
      <button 
        onClick={() => {
          generateInvoicePDF({
            invoiceNumber: invoiceData.invoice_number,
            customerName: invoiceData.customer_name,
            amount: invoiceData.amount,
            taxRate: invoiceData.tax_rate,
            taxAmount: invoiceData.tax_amount,
            totalAmount: invoiceData.total_amount,
            dueDate: invoiceData.due_date,
            notes: invoiceData.notes,
            createdAt: invoiceData.created_at,
            businessProfile,
          })
        }}
        className="w-full rounded-lg bg-blue-600/20 border border-blue-500/30 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-600/30 transition active:scale-[0.98]">
        ⬇️ Download PDF
      </button>
    </div>
  )
}

/* ── OCR Failed Card ── */
function OcrFailedCard() {
  return (
    <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm w-full shadow-lg">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="text-3xl">📷❌</div>
        <div className="text-red-400 font-medium">Text Detection Failed</div>
        <p className="text-xs text-gray-400">
          We couldn't read the receipt. Please try uploading a clearer image or type the transaction details manually.
        </p>
        <button 
          onClick={() => document.getElementById('chat-file-input')?.click()}
          className="mt-2 px-5 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition text-xs font-semibold active:scale-[0.98]"
        >
          Re-upload Image
        </button>
      </div>
    </div>
  )
}

/* ── Message Bubble ── */
function MessageBubble({
  msg, onAccept, onDecline, onEdit, onGenerateInvoice, onSkipInvoice, businessProfile
}: {
  msg: Message
  onAccept: (msgId: string, tx: PendingTx) => void
  onDecline: (msgId: string) => void
  onEdit: (msgId: string) => void
  onGenerateInvoice: (msgId: string) => void
  onSkipInvoice: (msgId: string) => void
  businessProfile?: any
}) {
  const isUser = msg.role === 'user'
  const hasPending = !!msg.pendingTx && !!msg.pendingStatus

  const [expandedImage, setExpandedImage] = useState(false)
  const hasImage = !!msg.metadata?.imageBase64

  return (
    <>
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          isUser ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-lg'
        }`}>
          {isUser ? '👤' : '🤖'}
        </div>

        {/* Bubble */}
        <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* Image attachment — shown above text bubble for cleaner layout */}
          {hasImage && (
            <div
              className={`relative group cursor-pointer overflow-hidden rounded-2xl border border-white/10 shadow-lg ${
                isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
              }`}
              style={{ maxWidth: '260px' }}
              onClick={() => setExpandedImage(true)}
            >
              <img
                src={`data:${msg.metadata!.mimeType || 'image/jpeg'};base64,${msg.metadata!.imageBase64}`}
                alt="Uploaded document"
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 rounded-full p-2">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              {/* Image badge */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                </svg>
                <span className="text-[9px] text-white/80 font-medium">Document</span>
              </div>
            </div>
          )}

          {/* Text bubble */}
          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? `${hasImage ? 'rounded-tr-2xl' : 'rounded-tr-sm'} bg-emerald-600 text-white`
              : 'rounded-tl-sm bg-[#111815] text-gray-200 border border-white/5'
          }`}>
            {hasImage && msg.content !== '📎 Attached Document' && (
              <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/15">
                <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span className="text-[10px] text-white/60 font-medium">Image + Message</span>
              </div>
            )}
            <p dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
          </div>

          {/* OCR Failed card */}
          {msg.metadata?.intent === 'ocr_failed' && (
            <div className="w-full">
              <OcrFailedCard />
            </div>
          )}

          {/* Pending transaction card */}
          {hasPending && (
            <div className="w-full">
              <PendingTransactionCard
                tx={msg.pendingTx!}
                status={msg.pendingStatus!}
                onAccept={(editedTx) => onAccept(msg.id, editedTx)}
                onDecline={() => onDecline(msg.id)}
                onEdit={() => onEdit(msg.id)}
              />
            </div>
          )}

          {/* Invoice prompt card */}
          {msg.invoicePrompt && (
            <div className="w-full">
              <InvoicePromptCard
                status={msg.invoicePrompt}
                onGenerate={() => onGenerateInvoice(msg.id)}
                onSkip={() => onSkipInvoice(msg.id)}
              />
            </div>
          )}

          {/* Already-saved transaction card (from history) */}
          {!hasPending && msg.metadata?.transaction && (
            <div className="w-full">
              <TransactionCard tx={msg.metadata.transaction} />
            </div>
          )}

          {/* Retrieved Invoice Card */}
          {msg.metadata?.invoiceData && (
            <div className="w-full">
              <RetrievedInvoiceCard invoiceData={msg.metadata.invoiceData} businessProfile={businessProfile} />
            </div>
          )}

          <span className="text-[10px] text-gray-700">
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Lightbox overlay for expanded image */}
      {expandedImage && hasImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer animate-fadeIn"
          onClick={() => setExpandedImage(false)}
        >
          <div className="relative max-w-[90vw] max-h-[85vh] animate-scaleIn">
            <img
              src={`data:${msg.metadata!.mimeType || 'image/jpeg'};base64,${msg.metadata!.imageBase64}`}
              alt="Expanded document"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedImage(false) }}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white border border-white/20 hover:bg-gray-700 transition shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-lg">🤖</div>
      <div className="rounded-2xl rounded-tl-sm bg-[#111815] border border-white/5 px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Main ChatWindow ── */
export default function ChatWindow({ initialMessages, userName, businessProfile }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.map((m) => {
      const meta = (m.metadata as Message['metadata']) ?? null
      return {
        ...m,
        metadata: meta,
        // Restore pending state from history (already resolved)
        pendingTx: (meta?.pendingTransaction as PendingTx) ?? null,
        pendingStatus: meta?.pendingTransaction
          ? (meta?.intent === 'transaction_confirmed' ? 'accepted'
            : meta?.intent === 'transaction_declined' ? 'declined'
            : 'accepted') as 'accepted' | 'declined' // old messages default to resolved
          : undefined,
      }
    })
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate image preview URL when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  /* ── Accept handler ── */
  const handleAccept = useCallback(async (msgId: string, tx: PendingTx) => {
    // Optimistically mark as accepted
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, pendingStatus: 'accepted' as const, pendingTx: tx } : m
    ))

    try {
      const res = await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: tx, action: 'accept' }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        // Revert to pending on failure
        setMessages((prev) => prev.map((m) =>
          m.id === msgId ? { ...m, pendingStatus: 'pending' as const } : m
        ))
        return
      }

      // Add confirmation message
      const confirmMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: data.reply ?? '✅ Transaction saved!',
        metadata: { intent: 'transaction_confirmed', transaction: data.transaction },
        // If it's a sales transaction, show invoice prompt
        invoicePrompt: data.promptInvoice ? 'asking' : undefined,
        invoiceTransactionId: data.promptInvoice ? data.transaction?.id : undefined,
        invoiceCustomerName: data.promptInvoice ? data.customerName : undefined,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, confirmMsg])
      router.refresh()
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === msgId ? { ...m, pendingStatus: 'pending' as const } : m
      ))
    }
  }, [])

  /* ── Decline handler ── */
  const handleDecline = useCallback(async (msgId: string) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, pendingStatus: 'declined' as const } : m
    ))

    try {
      await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      })

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: '❌ Transaction discarded.',
          created_at: new Date().toISOString(),
        },
      ])
    } catch { /* silently fail */ }
  }, [])

  /* ── Edit handler ── */
  const handleEdit = useCallback((msgId: string) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, pendingStatus: 'editing' as const } : m
    ))
  }, [])

  /* ── Generate Invoice handler ── */
  const handleGenerateInvoice = useCallback(async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId)
    if (!msg?.invoiceTransactionId || !msg?.invoiceCustomerName) return

    // Mark as generating
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, invoicePrompt: 'generating' as const } : m
    ))

    try {
      const txData = msg.metadata?.transaction
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: msg.invoiceTransactionId,
          customerName: msg.invoiceCustomerName,
          amount: txData?.amount ?? 0,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages((prev) => prev.map((m) =>
          m.id === msgId ? { ...m, invoicePrompt: 'asking' as const } : m
        ))
        return
      }

      // Generate PDF client-side
      generateInvoicePDF({
        invoiceNumber: data.invoice.invoice_number,
        customerName: msg.invoiceCustomerName,
        amount: data.invoice.amount,
        taxRate: data.invoice.tax_rate,
        taxAmount: data.invoice.tax_amount,
        totalAmount: data.invoice.total_amount,
        dueDate: data.invoice.due_date,
        notes: data.invoice.notes,
        createdAt: data.invoice.created_at,
        description: txData?.description,
        category: txData?.category,
        transactionDate: txData?.date,
        businessProfile,
      })

      // Mark as done
      setMessages((prev) => prev.map((m) =>
        m.id === msgId ? { ...m, invoicePrompt: 'done' as const } : m
      ))

      // Add confirmation message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: data.reply ?? `📄 Invoice generated!`,
          metadata: {
            invoiceData: data.invoice,
          },
          created_at: new Date().toISOString(),
        },
      ])
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === msgId ? { ...m, invoicePrompt: 'asking' as const } : m
      ))
    }
  }, [messages])

  /* ── Skip Invoice handler ── */
  const handleSkipInvoice = useCallback((msgId: string) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, invoicePrompt: undefined } : m
    ))
  }, [])

  /* ── Send message ── */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if ((!trimmed && !selectedFile) || loading) return

    let imageBase64: string | undefined
    let mimeType: string | undefined

    if (selectedFile) {
      try {
        const base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(selectedFile)
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = error => reject(error)
        })
        imageBase64 = base64Str.split(',')[1]
        mimeType = selectedFile.type
      } catch (err) {
        console.error('Failed to read file:', err)
        return
      }
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed || '📎 Attached Document',
      metadata: imageBase64 ? { imageBase64, mimeType } : null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSelectedFile(null)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, imageBase64, mimeType }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        const errorMsg = data.error ?? 'Something went wrong. Please try again.'
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            content: `⚠️ ${errorMsg}`,
            created_at: new Date().toISOString(),
          },
        ])
        return
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply ?? 'Sorry, something went wrong.',
        metadata: {
          intent: data.intent,
          transaction: data.transaction ?? null,
          pendingTransaction: data.pendingTransaction ?? null,
          invoiceData: data.invoiceData ?? null,
        },
        pendingTx: data.pendingTransaction ?? null,
        pendingStatus: data.pendingTransaction ? 'pending' : undefined,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMsg])

      // If we modified an invoice/transaction directly via chat, refresh the sidebar
      if (data.intent === 'manage_invoice') {
        router.refresh()
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: '⚠️ Network error. Please check your connection and try again.',
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, selectedFile])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Ensure loading state correctly tracks selectedFile
  const canSend = (!loading && (input.trim().length > 0 || selectedFile !== null))

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scroll-smooth">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 text-3xl">
              🤖
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                Hey {userName.split(' ')[0]}! I&apos;m your FintraBooks
              </h2>
              <p className="text-sm text-gray-500 max-w-xs">
                Tell me about any money you spent or received and I&apos;ll record it automatically.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s.replace(/^[^\s]+\s/, ''))}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onEdit={handleEdit}
            onGenerateInvoice={handleGenerateInvoice}
            onSkipInvoice={handleSkipInvoice}
            businessProfile={businessProfile}
          />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-white/5 bg-[#080c0a] px-4 py-3">
        {!isEmpty && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none">
            {['Show balance', 'Monthly report', 'Show expenses', 'Statement for...', 'Outstanding for...'].map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                disabled={loading}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] text-gray-500 hover:border-emerald-500/30 hover:text-emerald-400 transition disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Image Preview */}
        {selectedFile && (
          <div className="mb-3 px-1 animate-slideUp">
            <div className="relative inline-flex flex-col rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 max-w-[280px]">
              {/* Image thumbnail */}
              {imagePreview && (
                <div className="relative w-full max-h-[180px] overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              )}
              {/* File info bar */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#0a0f0d]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-emerald-400 truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {(selectedFile.size / 1024).toFixed(0)} KB · Ready to send
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-end gap-3">
          <input 
            id="chat-file-input"
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
            title="Attach Receipt or Invoice"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. I spent ₹200 on lunch…"
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 max-h-[120px]"
            style={{ height: '44px' }}
          />
          <button
            id="chat-send"
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-700">
          Press Enter to send · Shift+Enter for new line · Powered by Gemini AI
        </p>
      </div>
    </div>
  )
}
