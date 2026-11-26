"use server";

import { revalidatePath } from "next/cache";
import { importar, previa, type LinhaImportacao } from "@/lib/importacao";

const LIMITE = 500;

export async function previaAcao(linhas: LinhaImportacao[]) {
  if (linhas.length > LIMITE) throw new Error("Lote grande demais");
  return previa(linhas);
}

export async function importarAcao(linhas: LinhaImportacao[], modo: "ignorar" | "atualizar") {
  if (linhas.length > LIMITE) throw new Error("Lote grande demais");
  const r = await importar(linhas, modo);
  revalidatePath("/contratos");
  revalidatePath("/");
  return r;
}

export async function apagarExemplosAcao() {
  const { prisma } = await import("@/lib/db");
  const r = await prisma.contrato.deleteMany({ where: { exemplo: true } });
  // setores/modalidades de exemplo sem contratos também saem
  await prisma.setor.deleteMany({ where: { contratos: { none: {} } } });
  await prisma.modalidade.deleteMany({ where: { contratos: { none: {} } } });
  revalidatePath("/", "layout");
  return r.count;
}
