import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 – Page Not Found',
  description: 'The page you are looking for does not exist. Go back to AccountAI — simple accounting software for small business.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080c0a] px-6 text-center">
      <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />

      <p className="text-8xl font-bold text-emerald-500/20">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
        >
          Go Home
        </Link>
        <Link
          href="/chat"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition"
        >
          Open Chat
        </Link>
      </div>
    </div>
  )
}
