import { PrismaClient } from "@prisma/client";

/**
 * O banco gratuito aceita poucas conexões simultâneas. Na Vercel cada servidor
 * abriria várias (o padrão do Prisma é 2×CPUs+1), então limitamos a 1 por
 * servidor; as consultas esperam na fila em vez de abrir novas conexões.
 */
function urlComLimite(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) return url;
  const u = new URL(url);
  if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", process.env.VERCEL ? "1" : "5");
  if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
  return u.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: urlComLimite() });

// Reaproveita o mesmo cliente entre requisições no mesmo servidor
globalForPrisma.prisma = prisma;
