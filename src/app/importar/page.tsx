import { prisma } from "@/lib/db";
import Importador from "./Importador";
import ApagarExemplos from "./ApagarExemplos";

export const dynamic = "force-dynamic";
// importação pode levar mais tempo que o padrão do servidor
export const maxDuration = 60;

export default async function PaginaImportar() {
  const [setores, exemplos] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { nome: true } }),
    prisma.contrato.count({ where: { exemplo: true } }),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Importar planilha</h1>
        <p className="text-sm text-slate-600">Carregue vários contratos de uma vez a partir de um arquivo Excel (.xlsx) ou CSV.</p>
      </div>
      {exemplos > 0 && <ApagarExemplos quantidade={exemplos} />}
      <Importador setores={setores.map((s) => s.nome)} />
    </div>
  );
}
