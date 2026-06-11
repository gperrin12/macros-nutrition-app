import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "./register-sw";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "macros",
  description: "A personal macro tracker. Type what you ate; it does the rest.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "macros",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0d0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
