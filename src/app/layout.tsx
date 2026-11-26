import type { Metadata } from "next";
import Cabecalho from "@/components/Cabecalho";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contratos de Licitação",
  description: "Consulta de contratos de licitação",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Cabecalho />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
