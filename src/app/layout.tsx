import type { Metadata, Viewport } from "next";
import { Carlito } from "next/font/google";
import { Suspense } from "react";
import { NavProgress } from "@/components/feedback/nav-progress";
import { TapFeedback } from "@/components/feedback/tap-feedback";
import { OpenInAppHint } from "@/components/feedback/open-in-app-hint";
import { ServiceWorker } from "@/components/feedback/service-worker";
import "./globals.css";

const carlito = Carlito({
  variable: "--font-carlito",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "KRE Asset Management Tool",
  description: "Plant and vehicle maintenance by KRE Consulting",
  applicationName: "KRE Assets",
  // iPhone "Add to Home Screen": full screen, content runs under a see-through status bar (safe-area padding keeps it clear).
  appleWebApp: { capable: true, title: "KRE Assets", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // "cover" lets the app fill the whole iPhone screen (notch + home bar); env(safe-area-inset-*) pads it back.
  viewportFit: "cover",
  themeColor: "#0b0b10",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body className={`${carlito.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <TapFeedback />
        <OpenInAppHint />
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
