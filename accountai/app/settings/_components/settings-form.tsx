'use client'

import { useActionState } from 'react'
import { updateBusinessProfile, type SettingsState } from '@/app/actions/settings'

const initialState: SettingsState = { error: null, message: null }

export default function SettingsForm({ initialData }: { initialData: any }) {
  const [state, action, pending] = useActionState(updateBusinessProfile, initialState)

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm text-emerald-400">{state.message}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="business_name" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
          Business Name
        </label>
        <input
          id="business_name"
          name="business_name"
          type="text"
          defaultValue={initialData.business_name}
          placeholder="Acme Corp"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="business_address" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
          Business Address
        </label>
        <textarea
          id="business_address"
          name="business_address"
          rows={3}
          defaultValue={initialData.business_address}
          placeholder="123 Startup Lane, Tech City, 560001"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label htmlFor="business_contact" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
            Contact Number
          </label>
          <input
            id="business_contact"
            name="business_contact"
            type="tel"
            defaultValue={initialData.business_contact}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="business_email" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
            Business Email
          </label>
          <input
            id="business_email"
            name="business_email"
            type="email"
            defaultValue={initialData.business_email}
            placeholder="billing@acmecorp.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={pending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Details'
          )}
        </button>
      </div>
    </form>
  )
}
