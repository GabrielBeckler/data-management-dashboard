import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ótica Vision | Sistema de Gestão",
  description: "Painel administrativo da Ótica Vision",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
