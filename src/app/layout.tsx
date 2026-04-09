
import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'StudyForge - Interactive Church Learning',
  description: 'A simple and powerful platform for church teaching and spiritual growth.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <script src="https://meet.jit.si/external_api.js" async></script>
      </head>
      <body className="font-body antialiased min-h-screen">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
