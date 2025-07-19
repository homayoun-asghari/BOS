import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import LayoutWrapper from './LayoutWrapper';
import { Toaster } from 'sonner';
import { MobileRightPanelProvider } from '@/context/mobile-right-panel-context';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProfileProvider } from '@/context/profile-context';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <div className="flex flex-col h-full">
        <ThemeProvider>
          <AuthProvider>
            <ProfileProvider>
              <MobileRightPanelProvider>
                <LayoutWrapper>
                  {children}
                </LayoutWrapper>
              </MobileRightPanelProvider>
            </ProfileProvider>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
