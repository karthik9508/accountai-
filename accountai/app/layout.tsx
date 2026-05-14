import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fintrabooks.com";

export const viewport: Viewport = {
  themeColor: "#080c0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AccountAI – Simple Accounting Software for Small Business | FintraBooks",
    template: "%s | AccountAI by FintraBooks",
  },
  description:
    "AccountAI is an easy accounting software with a chat interface for small businesses. Record sales, purchases & expenses by just chatting. Simple accounting software powered by AI.",
  keywords: [
    "AccountAI",
    "simple accounting software for small business",
    "easy accounting software",
    "chat interface accounting software",
    "AI accounting app",
    "accounting software India",
    "small business bookkeeping",
    "AI bookkeeping",
    "expense tracker chat",
    "invoice software small business",
  ],
  authors: [{ name: "FintraBooks" }],
  creator: "FintraBooks",
  publisher: "FintraBooks",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "AccountAI by FintraBooks",
    title: "AccountAI – Simple Accounting Software for Small Business",
    description:
      "The easiest chat interface accounting software for small businesses. Record transactions, generate invoices & track payments — just by chatting with AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AccountAI – Easy Accounting Software with Chat Interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AccountAI – Simple Accounting Software for Small Business",
    description:
      "Easy accounting software with a chat interface. Powered by AI. Perfect for small businesses.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AccountAI",
    alternateName: "FintraBooks",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AccountAI is a simple accounting software for small business with a chat interface. Easy accounting software powered by AI for Indian businesses.",
    url: SITE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "120",
    },
    featureList: [
      "Chat interface for recording transactions",
      "AI-powered expense categorization",
      "Invoice generation",
      "Sales and purchase management",
      "Payment tracking",
      "Financial reports and statements",
    ],
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FintraBooks",
    url: SITE_URL,
    logo: `${SITE_URL}/fintrabooks-logo.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-8695018620",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: "English",
    },
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/fintrabooks-logo.svg" />
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
