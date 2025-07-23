import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../../lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vindex Chain Wallet - Modern Cryptocurrency Wallet',
  description: 'The official wallet for Vindex Chain, a Proof of Stake blockchain with advanced DeFi features.',
  keywords: 'vindex, blockchain, cryptocurrency, wallet, defi, staking, proof of stake',
  authors: [{ name: 'Vindex Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#DC2626',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Vindex Chain Wallet',
    description: 'Modern cryptocurrency wallet for Vindex Chain',
    url: 'https://wallet.vindex.io',
    siteName: 'Vindex Chain',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vindex Chain Wallet',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vindex Chain Wallet',
    description: 'Modern cryptocurrency wallet for Vindex Chain',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gradient-to-br from-vindex-gray-50 to-white`}>
        <AuthProvider>
          <div id="root" className="min-h-full">
            {children}
          </div>
        
        {/* Background Elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-vindex-red/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-vindex-red/3 rounded-full blur-3xl"></div>
        </div>
        </AuthProvider>
      </body>
    </html>
  )
}
