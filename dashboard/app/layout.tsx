import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sharebly · Issue Verification',
  description: 'Continuous verification of known Sharebly UI issues',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen grid-bg selection:bg-[var(--accent-dim)] selection:text-[var(--accent)]">
        {children}
      </body>
    </html>
  );
}
