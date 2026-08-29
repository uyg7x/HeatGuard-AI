// ============================================================
// HeatGuard AI — Root Layout
// Enterprise Climate-Tech SaaS Platform — Light Theme
// ============================================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'HeatGuard AI',
  description: 'Real-time hyperlocal heat intelligence for resilient cities. Powered by FortyGuard Temperature API and AI Agent tools.',
  keywords: ['heat intelligence', 'urban climate', 'resilient cities', 'climate tech', 'AI agents'],
  authors: [{ name: 'HeatGuard AI Team' }],
  openGraph: {
    title: 'HeatGuard AI',
    description: 'Real-time hyperlocal heat intelligence for resilient cities.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#F8FAFC" />
        {/* Leaflet CSS — required for map tile and control rendering */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link rel="preconnect" href="https://unpkg.com" />
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
