import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="cartao p-10 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O contrato pode ter sido excluído ou o endereço está incorreto.</p>
      <Link href="/contratos" className="botao-primario mt-6">Ir para a busca</Link>
    </div>
  );
}
