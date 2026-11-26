import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const total = await prisma.contrato.count();
  return (
    <div className="cartao p-8 text-center">
      <h1 className="text-2xl font-semibold">Painel</h1>
      <p className="mt-2 text-slate-600">
        Os gráficos e totais chegam na Etapa 4. Por enquanto, há <strong>{total}</strong> contratos cadastrados.
      </p>
      <Link href="/contratos" className="botao-primario mt-6">Buscar contratos</Link>
    </div>
  );
}
