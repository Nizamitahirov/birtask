import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { ClientToaster } from '@/components/ui/ClientToaster'

export const metadata: Metadata = {
  title: 'BirTask — Layihə İdarəetmə',
  description: 'Google Sheets ilə inteqrasiyalı layihə idarəetmə platforması',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      {/* Prevent flash of wrong theme by reading localStorage before React hydrates */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('birtask-theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body className="mesh-bg min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <ClientToaster />
      </body>
    </html>
  )
}
