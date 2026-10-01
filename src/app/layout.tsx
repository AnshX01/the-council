import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Council | Autonomous Multi-Agent Deliberation Chamber',
  description:
    'A council of 8 AI personas deliberates, debates, shifts positions, and arrives at unanimous consensus or honest dissent on complex dilemmas.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200 relative">
        {/* Soft Ambient Background Mesh Behind Glass Surfaces */}
        <div className="ambient-background" aria-hidden="true">
          <div className="ambient-orb-1" />
          <div className="ambient-orb-2" />
          <div className="ambient-orb-3" />
        </div>

        <OfflineBanner />

        <ToastProvider>
          <CommandPalette />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {children}
            </main>
            <footer className="w-full border-t border-gray-200/50 dark:border-white/10 py-6 text-center text-xs text-gray-500 dark:text-gray-400 glass-panel-subtle !rounded-none !border-x-0 !border-b-0 backdrop-blur-md">
              <p>
                The Council &bull; Built with Google Gemini API (`@google/genai`) &bull; Strict
                Honesty Rule Deliberation Protocol
              </p>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
