"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", rotulo: "Painel" },
  { href: "/contratos", rotulo: "Buscar contratos" },
  { href: "/contratos/novo", rotulo: "Novo contrato" },
];

export default function Cabecalho() {
  const path = usePathname();
  const ativo = (href: string) =>
    href === "/" ? path === "/" : href === "/contratos" ? path.startsWith("/contratos") && path !== "/contratos/novo" : path === href;

  return (
    <header className="bg-marca-800 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-white/15 text-base">📑</span>
          Contratos de Licitação
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 ${ativo(l.href) ? "bg-white/20 font-medium" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
