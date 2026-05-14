import { getPostData, getSortedPostsData } from '@/lib/blogs'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export async function generateStaticParams() {
  const posts = getSortedPostsData()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// Ensure slug params are awaited properly for Next.js app directory standards in recent versions
type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params
  const post = getPostData(resolvedParams.slug)
  if (!post) {
    return { title: 'Post Not Found - AccountAI' }
  }
  return {
    title: `${post.title} - AccountAI Blog`,
    description: post.excerpt,
  }
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const resolvedParams = await params
  const post = getPostData(resolvedParams.slug)

  if (!post) {
    notFound()
  }

  // Format the date nicely
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex min-h-screen flex-col bg-[#080c0a] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 border-b border-white/5 bg-[#080c0a]/80 backdrop-blur-md sticky top-0">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/fintrabooks-logo.svg" alt="AccountAI - Simple Accounting Software" className="h-11 w-11 rounded-xl" />
          <span className="text-lg font-bold text-white tracking-tight">AccountAI</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/blog" className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition">Blog</Link>
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
      <main className="relative z-10 flex-1 px-6 md:px-12 py-16 w-full max-w-3xl mx-auto">
        <Link href="/blog" className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 text-sm font-medium mb-12 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all posts
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">{post.category}</span>
            <span className="text-gray-500 text-sm">{formattedDate}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 leading-tight">{post.title}</h1>
        </header>

        <div className="prose prose-invert prose-emerald max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
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
        </div>
      </footer>
    </div>
  )
}
