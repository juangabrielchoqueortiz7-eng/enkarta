import type { Metadata } from "next";
import "./globals.css";

import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Enkarta — Invitaciones Digitales",
  description: "Crea invitaciones digitales elegantes para bodas, XV años, cumpleaños y más. Personalizables y listas para compartir por WhatsApp.",
  openGraph: {
    title: "Enkarta — Invitaciones Digitales",
    description: "Invitaciones digitales que enamoran: sobre animado, música, confirmación de asistencia y diseño premium.",
    type: 'website',
    siteName: 'Enkarta',
    images: [{ url: '/catalog/dolcevita.jpg' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
