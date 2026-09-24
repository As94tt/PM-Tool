import type { Metadata } from "next";
import { Sora, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AppStoreProvider } from "@/store/app-store-provider";
import { AuthGate } from "@/components/auth/auth-gate";

const fontHeading = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus | Internal Knowledge & Resource Platform",
  description:
    "Find colleagues, projects, skills and resources across the company.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontHeading.variable} ${fontBody.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppStoreProvider>
          <AuthGate>
            <TooltipProvider delay={150}>
              <AppShell>{children}</AppShell>
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </AuthGate>
        </AppStoreProvider>
      </body>
    </html>
  );
}
