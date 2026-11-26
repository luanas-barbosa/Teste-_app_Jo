import { opcoesFormulario } from "@/lib/carregar";
import ContratoForm from "../ContratoForm";

export const dynamic = "force-dynamic";

export default async function NovoContrato() {
  const { setores, modalidades } = await opcoesFormulario();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Novo contrato</h1>
        <p className="text-sm text-slate-600">Campos com <span className="text-rose-600">*</span> são obrigatórios. Número + ano não podem se repetir.</p>
      </div>
      <ContratoForm
        inicial={{ numero: "", ano: String(new Date().getFullYear()), setorId: "", modalidadeId: "", processo: "", objeto: "", empresaNome: "", empresaCnpj: "", valor: "", dataInicio: "", dataFim: "", statusManual: "", gestor: "", fiscal: "", observacoes: "", aditivos: [] }}
        setores={setores}
        modalidades={modalidades}
        voltar="/contratos"
      />
    </div>
  );
}
