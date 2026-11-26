"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { salvarContrato, type ContratoEntrada, type ResultadoSalvar } from "@/lib/salvar";

export async function salvarContratoAcao(entrada: ContratoEntrada, id?: number): Promise<ResultadoSalvar> {
  const r = await salvarContrato(entrada, id);
  if (r.ok) {
    revalidatePath("/contratos");
    revalidatePath("/");
  }
  return r;
}

export async function excluirContratoAcao(id: number) {
  await prisma.contrato.delete({ where: { id } });
  revalidatePath("/contratos");
  redirect("/contratos?excluido=1");
}
