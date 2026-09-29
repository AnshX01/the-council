import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
});

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
    <html lang="en" className={`dark ${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#fbfbfd] dark:bg-[#08090d] text-gray-900 dark:text-gray-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="w-full border-t border-gray-200/60 dark:border-gray-850/60 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            The Council &bull; Built with Google Gemini API (`@google/genai`) &bull; Strict
            Honesty Rule Deliberation Protocol
          </p>
        </footer>
      </body>
    </html>
  );
}
