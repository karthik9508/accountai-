import Link from 'next/link'
import { getSortedPostsData } from '@/lib/blogs'

export const metadata = {
  title: 'Blog - AccountAI',
  description: 'Insights, guides, and tips for managing your small business finances.',
}

export default async function BlogPage() {
  const posts = getSortedPostsData()

  return (
    <div className="flex min-h-screen flex-col bg-[#080c0a] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
      <div className="absolute top-40 left-0 h-[400px] w-[400px] rounded-full bg-emerald-600/5 blur-[100px]" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 border-b border-white/5 bg-[#080c0a]/80 backdrop-blur-md sticky top-0">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/fintrabooks-logo.svg" alt="AccountAI - Simple Accounting Software" className="h-11 w-11 rounded-xl" />
          <span className="text-lg font-bold text-white tracking-tight">AccountAI</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/blog"
            className="hidden md:block text-sm font-medium text-white transition"
          >
            Blog
          </Link>
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
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 md:px-12 py-16 w-full max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Blog</h1>
          <p className="text-gray-400 text-lg max-w-2xl">Insights, guides, and tips for managing your small business finances efficiently.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => {
            const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
            
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition duration-300 hover:bg-white/[0.04]">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">{post.category}</span>
                    <span className="text-gray-500 text-xs">{formattedDate}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition">{post.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{post.excerpt}</p>
                </div>
                <div className="mt-6 flex items-center text-emerald-500 text-sm font-medium">
                  Read article
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
        {posts.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No blog posts published yet. Check back later!
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-[#080c0a] pt-12 pb-8 px-6 md:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/fintrabooks-logo.svg" alt="AccountAI Logo" className="h-10 w-10 rounded-lg" />
              <span className="text-lg font-bold text-white tracking-tight">AccountAI</span>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs text-center md:text-left">
              Simple accounting software for small business. Easy chat interface powered by AI.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2 text-sm text-gray-400">
            <h3 className="text-white font-semibold mb-1">Contact Us</h3>
            <a href="mailto:support@fintrabooks.com" className="hover:text-emerald-400 transition">support@fintrabooks.com</a>
            <a href="tel:+918695018620" className="hover:text-emerald-400 transition">+91 8695018620</a>
            <p>Tiruppur, India</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© 2026 AccountAI by FintraBooks. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gray-400 transition">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-400 transition">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
