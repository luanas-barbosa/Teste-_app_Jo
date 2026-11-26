import { notFound } from "next/navigation";
import { carregarContrato, opcoesFormulario, paraEntrada } from "@/lib/carregar";
import { voltarSeguro } from "@/lib/navegacao";
import ContratoForm from "../../ContratoForm";

export const dynamic = "force-dynamic";

export default async function EditarContrato({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await carregarContrato(Number(id));
  if (!c) notFound();
  const { setores, modalidades } = await opcoesFormulario();
  const voltar = voltarSeguro(sp.voltar);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar contrato {c.numero}/{c.ano}</h1>
      <ContratoForm inicial={paraEntrada(c)} id={c.id} setores={setores} modalidades={modalidades} voltar={voltar} />
    </div>
  );
}
