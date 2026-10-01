import type { Metadata } from "next";
// @ts-expect-error Next.js loads this stylesheet as a side effect.
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";

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
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}