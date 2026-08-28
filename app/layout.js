import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'WAR KELAS — Rebut Ruanganmu',
  description: 'Real-time first-come-first-served classroom claiming.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
