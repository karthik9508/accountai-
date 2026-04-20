import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FintraBooks | The Best AI Bookkeeping App & Accounting Automation",
  description: "FintraBooks is a leading AI accounting app for small businesses in India. Automate your bookkeeping with our automatic expense tracker using chat. Experience the future of AI accounting today.",
  keywords: [
    "AI bookkeeping app",
    "ai accounting",
    "accounting automation ai",
    "AI accounting app for small businesses",
    "AI accounting app in India",
    "automatic expense tracker using chat"
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
