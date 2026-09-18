import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portföy Avcısı - Gayrimenkul Portföy Kazanım Platformu',
  description: 'Lead Intelligence & CRM sistemi. Emsal motoru, AI değerlendirme, WhatsApp entegrasyonu.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}