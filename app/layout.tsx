import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { CopilotKitProvider } from "@/components/CopilotKitProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexAuthProvider } from "@/src/providers/ConvexAuthProvider";
import { ClientBootstrap } from "@/src/providers/ClientBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Improve font loading performance
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Cieden - AI Assistant",
  description: "Voice-powered design and development assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider apiRoute="/api/auth">
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} font-sans antialiased`} suppressHydrationWarning>
          <ClientBootstrap />
          <ConvexAuthProvider>
            <CopilotKitProvider>
              {children}
            </CopilotKitProvider>
          </ConvexAuthProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
