// Import console override first
import '../utils/console';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import LayoutWrapper from './LayoutWrapper';
import { Toaster } from 'sonner';
import { MobileRightPanelProvider } from '@/context/mobile-right-panel-context';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProfileProvider } from '@/context/profile-context';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { RightPanelProvider } from "@/components/right-panel";
import ConsoleSilencer from "@/components/utils/ConsoleSilencer";
import { SearchParamsProvider } from "@/components/utils/SearchParamsProvider";
import { Suspense } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BOS",
  description: "BOS - Build on Stacks",
  icons: {
    icon: [
      { url: '/logo-dark/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo-dark/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-dark/favicon.ico' }
    ],
    apple: [
      { url: '/logo-dark/apple-touch-icon.png' }
    ],
    other: [
      { url: '/logo-dark/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo-dark/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  manifest: '/logo-dark/site.webmanifest'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ConsoleSilencer />
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const resolvedTheme = theme === 'system' ? systemTheme : theme;
                  
                  // Update favicon based on theme
                  const themePrefix = resolvedTheme === 'dark' ? 'logo-light' : 'logo-dark';
                  
                  // Update icons
                  document.querySelector('link[rel="icon"]')?.setAttribute('href', '/' + themePrefix + '/favicon.ico');
                  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', '/' + themePrefix + '/apple-touch-icon.png');
                  document.querySelector('link[rel="manifest"]')?.setAttribute('href', '/' + themePrefix + '/site.webmanifest');
                } catch (e) {
                  console.error('Error setting theme-aware favicon:', e);
                }
              })();
            `
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <SearchParamsProvider>
            <div className="flex flex-col h-full">
              <ThemeProvider>
                <AuthProvider>
                  <ProfileProvider>
                    <RefreshProvider>
                      <MobileRightPanelProvider>
                        <RightPanelProvider>
                          <LayoutWrapper>
                            {children}
                          </LayoutWrapper>
                        </RightPanelProvider>
                      </MobileRightPanelProvider>
                    </RefreshProvider>
                  </ProfileProvider>
                </AuthProvider>
                <Toaster position="top-center" />
              </ThemeProvider>
            </div>
          </SearchParamsProvider>
        </Suspense>
      </body>
    </html>
  );
}
