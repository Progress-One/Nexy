import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Mobile-optimized viewport settings:
 * - Prevents unwanted zoom on input focus
 * - Supports safe areas (iPhone notch/home indicator)
 * - Ensures consistent sizing on all devices
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // For iPhone safe areas
};

export const metadata: Metadata = {
  title: "Nexy — Discover What You Both Really Want",
  description: "The app that helps couples communicate desires without awkward conversations. Private. Judgment-free. AI-powered.",
  keywords: ["couples app", "relationship", "intimacy", "communication", "desires", "matching"],
  openGraph: {
    title: "Nexy — Discover What You Both Really Want",
    description: "The app that helps couples communicate desires without awkward conversations. Private. Judgment-free. AI-powered.",
    url: "https://nexy.life",
    siteName: "Nexy",
    type: "website",
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'Nexy — Discover What You Both Really Want' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexy — Discover What You Both Really Want",
    description: "The app that helps couples communicate desires without awkward conversations.",
    images: ['/og.svg'],
  },
  // PWA / Mobile web app settings
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nexy",
  },
  formatDetection: {
    telephone: false, // Prevent auto-linking phone numbers
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${playfair.variable} font-sans antialiased no-overscroll-y`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
