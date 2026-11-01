import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { en } from "@/messages/en";
import { Toaster } from "@/components/ui/sonner";
import { themeColors } from "./theme-colors";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: en.app.name,
  description: en.app.description,
  appleWebApp: { title: en.app.shortName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Lets the page reach the screen edges so env(safe-area-inset-*) can keep content clear of the notch and home bar
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColors.light },
    { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
