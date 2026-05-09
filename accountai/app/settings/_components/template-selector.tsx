'use client'

import { useState, useTransition } from 'react'
import { updateInvoiceTemplate } from '@/app/actions/settings'

type TemplateStyle = 'modern' | 'minimal' | 'bold'

const templates: {
  id: TemplateStyle
  name: string
  description: string
  icon: string
  gradient: string
  activeRing: string
  activeBg: string
  preview: {
    headerBg: string
    headerHeight: string
    accentColor: string
    bodyLines: number
    sidebarWidth?: string
  }
}[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean header with metric cards, rounded elements, and a professional emerald accent.',
    icon: '✨',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    activeRing: 'ring-emerald-500/50',
    activeBg: 'bg-emerald-500/10',
    preview: {
      headerBg: 'bg-[#0f172a]',
      headerHeight: 'h-10',
      accentColor: 'bg-emerald-500',
      bodyLines: 4,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Stripped-down elegance with a thin accent bar and ample whitespace for clarity.',
    icon: '🎯',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    activeRing: 'ring-blue-500/50',
    activeBg: 'bg-blue-500/10',
    preview: {
      headerBg: 'bg-white',
      headerHeight: 'h-1.5',
      accentColor: 'bg-slate-800',
      bodyLines: 3,
    },
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Sidebar-driven layout with dark navy panel and strong visual hierarchy.',
    icon: '🔥',
    gradient: 'from-purple-500/20 to-pink-500/10',
    activeRing: 'ring-purple-500/50',
    activeBg: 'bg-purple-500/10',
    preview: {
      headerBg: 'bg-[#0f172a]',
      headerHeight: 'h-full',
      accentColor: 'bg-emerald-500',
      bodyLines: 4,
      sidebarWidth: 'w-1/4',
    },
  },
]

function TemplatePreview({ template, isActive }: { template: typeof templates[0]; isActive: boolean }) {
  const { preview } = template

  // Bold template has a sidebar layout
  if (preview.sidebarWidth) {
    return (
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-white shadow-sm">
        {/* Sidebar */}
        <div className={`absolute inset-y-0 left-0 ${preview.sidebarWidth} ${preview.headerBg}`}>
          {/* Accent bar top */}
          <div className={`w-full h-1.5 ${preview.accentColor}`} />
          {/* Mini text lines in sidebar */}
          <div className="p-2 space-y-1.5 mt-2">
            <div className="h-1.5 w-3/4 rounded-full bg-white/30" />
            <div className="h-1 w-1/2 rounded-full bg-white/15" />
            <div className="h-1 w-2/3 rounded-full bg-white/15 mt-3" />
            <div className="h-1 w-1/2 rounded-full bg-white/10" />
            <div className="h-1 w-3/5 rounded-full bg-white/10 mt-3" />
            <div className="h-1 w-2/5 rounded-full bg-white/10" />
          </div>
        </div>
        {/* Content area */}
        <div className={`absolute inset-y-0 right-0 bg-gray-50`} style={{ left: '25%' }}>
          <div className="p-2.5 space-y-2">
            <div className="h-2 w-1/2 rounded-full bg-gray-800/80" />
            <div className="h-1 w-1/3 rounded-full bg-gray-300 mt-1" />
            {/* Mini table */}
            <div className="mt-3 space-y-1">
              <div className="h-1 w-full rounded-full bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-full rounded bg-gray-50" />
            </div>
            {/* Total pill */}
            <div className={`h-3 w-2/5 rounded-full ${preview.accentColor} ml-auto mt-2`} />
          </div>
        </div>
        {/* Active glow */}
        {isActive && (
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        )}
      </div>
    )
  }

  // Modern & Minimal
  return (
    <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-white shadow-sm">
      {/* Header */}
      <div className={`w-full ${preview.headerHeight} ${preview.headerBg} relative`}>
        {template.id === 'modern' && (
          <>
            {/* Business name */}
            <div className="absolute top-2 left-2.5">
              <div className="h-1.5 w-10 rounded-full bg-white/90" />
              <div className="h-1 w-6 rounded-full bg-white/30 mt-1" />
            </div>
            {/* INVOICE text */}
            <div className="absolute top-2 right-2.5">
              <div className="h-2 w-8 rounded-full bg-white/60" />
            </div>
            {/* Accent bar */}
            <div className={`absolute top-1.5 right-12 h-1 w-4 rounded-full ${preview.accentColor}`} />
          </>
        )}
        {template.id === 'minimal' && (
          <div className={`w-full h-full ${preview.accentColor}`} />
        )}
      </div>

      {/* Body */}
      <div className="p-2.5 space-y-2">
        {template.id === 'modern' && (
          <>
            {/* Metric cards row */}
            <div className="flex gap-1">
              <div className="flex-1 h-4 rounded bg-gray-100 border-l-2 border-blue-400" />
              <div className="flex-1 h-4 rounded bg-gray-100 border-l-2 border-amber-400" />
              <div className="flex-1 h-4 rounded bg-gray-100 border-l-2 border-emerald-400" />
            </div>
            {/* From/To */}
            <div className="flex gap-2 mt-1">
              <div className="flex-1 space-y-1">
                <div className="h-1 w-1/3 rounded-full bg-gray-300" />
                <div className="h-1.5 w-2/3 rounded-full bg-gray-700" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-1 w-1/3 rounded-full bg-gray-300" />
                <div className="h-1.5 w-2/3 rounded-full bg-gray-700" />
              </div>
            </div>
          </>
        )}
        {template.id === 'minimal' && (
          <>
            {/* Business name */}
            <div className="h-2 w-1/2 rounded-full bg-gray-800" />
            {/* From / To */}
            <div className="flex gap-2 mt-2">
              <div className="flex-1 space-y-1">
                <div className="h-1 w-1/4 rounded-full bg-gray-300" />
                <div className="h-1.5 w-3/4 rounded-full bg-gray-600" />
                <div className="h-1 w-1/2 rounded-full bg-gray-200" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-1 w-1/4 rounded-full bg-gray-300" />
                <div className="h-1.5 w-3/4 rounded-full bg-gray-600" />
              </div>
            </div>
          </>
        )}

        {/* Table */}
        <div className="mt-2 space-y-1">
          <div className={`h-1 w-full rounded-full ${template.id === 'modern' ? 'bg-[#0f172a]' : 'bg-gray-200'}`} />
          {Array.from({ length: preview.bodyLines }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-gray-50" />
          ))}
        </div>

        {/* Total */}
        <div className={`h-3 w-2/5 rounded-full ${preview.accentColor} ml-auto mt-2`} />
      </div>

      {/* Active glow */}
      {isActive && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
      )}
    </div>
  )
}

export default function TemplateSelector({ currentTemplate }: { currentTemplate: TemplateStyle }) {
  const [selected, setSelected] = useState<TemplateStyle>(currentTemplate)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSelect = (id: TemplateStyle) => {
    setSelected(id)
    setSaved(false)
    setError(null)

    startTransition(async () => {
      const result = await updateInvoiceTemplate(id)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Status messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 animate-fadeIn">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 animate-fadeIn">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm text-emerald-400">Template updated successfully!</p>
        </div>
      )}

      {/* Template cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {templates.map((tmpl) => {
          const isActive = selected === tmpl.id
          return (
            <button
              key={tmpl.id}
              onClick={() => handleSelect(tmpl.id)}
              disabled={isPending}
              className={`group relative flex flex-col rounded-2xl border p-3 transition-all duration-300 text-left ${
                isActive
                  ? `border-white/20 ${tmpl.activeBg} ${tmpl.activeRing} ring-1 shadow-lg`
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
              } ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs shadow-lg shadow-emerald-500/30 animate-scaleIn">
                  ✓
                </div>
              )}

              {/* Preview */}
              <div className="mb-3">
                <TemplatePreview template={tmpl} isActive={isActive} />
              </div>

              {/* Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{tmpl.icon}</span>
                  <h3 className={`text-sm font-semibold transition ${
                    isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {tmpl.name}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {tmpl.description}
                </p>
              </div>

              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tmpl.gradient} opacity-0 transition-opacity duration-300 pointer-events-none ${
                isActive ? 'opacity-100' : 'group-hover:opacity-50'
              }`} />
            </button>
          )
        })}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving preference...
        </div>
      )}
    </div>
  )
}
