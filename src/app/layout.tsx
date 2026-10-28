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
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "TallerTrack • Sistema Operativo para Talleres y Llanteras",
  description: "Sistema integral de gestión de órdenes de trabajo, inspección digital DVI y control para talleres y llanteras",
  manifest: "/manifest.json",
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
