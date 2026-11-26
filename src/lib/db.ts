import { PrismaClient } from "@prisma/client";

/**
 * Escolhe como o app conversa com o banco.
 *
 * 1. Preferência: a URL com pool do Prisma Postgres ("prisma+postgres://…",
 *    criada pela Vercel como PRISMA_DATABASE_URL). As consultas vão por HTTP e
 *    quem gerencia as conexões é o próprio Prisma, então nunca estoura o limite
 *    de conexões, por mais servidores que a Vercel abra.
 * 2. Senão (ex.: rodando no computador ou outro Postgres): conexão direta,
 *    limitada a poucas conexões por servidor.
 *
 * As migrações (no build) continuam usando a DATABASE_URL direta.
 */
export function escolherConexao(): { url?: string; modo: "pool" | "direta" | "padrao" } {
  const ehPool = (v?: string) => !!v && /^prisma(\+postgres)?:\/\//.test(v);
  const pool = ehPool(process.env.PRISMA_DATABASE_URL)
    ? process.env.PRISMA_DATABASE_URL
    : Object.values(process.env).find((v) => ehPool(v));
  if (pool) return { url: pool, modo: "pool" };

  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) return { url, modo: "padrao" };
  const u = new URL(url);
  if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", process.env.VERCEL ? "1" : "5");
  if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
  return { url: u.toString(), modo: "direta" };
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: escolherConexao().url });

// Reaproveita o mesmo cliente entre requisições no mesmo servidor
globalForPrisma.prisma = prisma;
