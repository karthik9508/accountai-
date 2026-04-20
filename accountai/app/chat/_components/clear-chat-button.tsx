'use client'

import { useTransition } from 'react'

export default function ClearChatButton({ clearAction }: { clearAction: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        if (window.confirm('Are you sure you want to clear your entire chat history? This cannot be undone.')) {
          startTransition(async () => {
            await clearAction()
            window.location.reload()
          })
        }
      }}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
      title="Clear Chat History"
    >
      {isPending ? (
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        '🗑️'
      )}
      <span className="hidden sm:inline">{isPending ? 'Clearing...' : 'Clear Chat'}</span>
    </button>
  )
}
