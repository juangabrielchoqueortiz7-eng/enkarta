import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enkarta — Invitaciones Digitales",
  description: "Crea invitaciones digitales elegantes para bodas, XV años, cumpleaños y más. Personalizables y listas para compartir por WhatsApp.",
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
