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
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="The official wallet for Vindex Chain, a Proof of Stake blockchain with advanced DeFi features." />
        <meta name="keywords" content="vindex, blockchain, cryptocurrency, wallet, defi, staking, proof of stake" />
        <meta name="theme-color" content="#DC2626" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <title>Vindex Chain Wallet - Modern Cryptocurrency Wallet</title>
        {/* Open Graph / Twitter */}
        <meta property="og:title" content="Vindex Chain Wallet" />
        <meta property="og:description" content="Modern cryptocurrency wallet for Vindex Chain" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://vindex-v3-wallet-app.vercel.app/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vindex Chain Wallet" />
        <meta name="twitter:description" content="Modern cryptocurrency wallet for Vindex Chain" />
        <meta name="twitter:image" content="/og-image.png" />
      </head>
      <body className={`${inter.className} h-full bg-gradient-to-br from-vindex-gray-50 to-white`}>
        <AuthProvider>
          <div id="root" className="min-h-full flex flex-col">
            {children}
            <footer className="w-full bg-gray-100 border-t border-gray-200 py-6 mt-auto">
              <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-2 md:mb-0">
                  <span className="font-bold text-red-600">Vindex Chain</span>
                  <span>© {new Date().getFullYear()}</span>
                </div>
                <div className="flex gap-4">
                  <a href="/privacy" className="hover:text-red-600">Privacidad</a>
                  <a href="/terms" className="hover:text-red-600">Términos</a>
                  <a href="mailto:contact@vindex.io" className="hover:text-red-600">Contacto</a>
                </div>
              </div>
            </footer>
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
