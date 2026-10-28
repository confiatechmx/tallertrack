import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

export const viewport: Viewport = {
  themeColor: "#1C3EFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tallertrack.com"),
  title: "TallerTrack • Sistema Operativo para Talleres y Llanteras",
  description: "Sistema integral de gestión de órdenes de trabajo, inspección digital DVI y control para talleres y llanteras",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "TallerTrack • Sistema Operativo para Talleres y Llanteras",
    description: "Sistema integral de gestión de órdenes de trabajo, inspección digital DVI y control para talleres y llanteras.",
    url: "https://www.tallertrack.com",
    siteName: "TallerTrack",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TallerTrack - Sistema Operativo para Talleres y Llanteras",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TallerTrack • Sistema Operativo para Talleres y Llanteras",
    description: "Sistema integral de gestión de órdenes de trabajo, inspección digital DVI y control para talleres y llanteras.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TallerTrack",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`h-full antialiased ${geist.variable}`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
