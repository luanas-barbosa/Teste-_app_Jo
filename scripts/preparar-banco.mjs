// Roda as migrações e os dados de exemplo durante o build.
// Se o banco estiver ocupado (ex.: "too many connections"), tenta de novo e,
// em último caso, segue o build: a estrutura do banco já costuma estar em dia.
import { execSync } from "node:child_process";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function tentar(nome, comando, tentativas = 4) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      execSync(comando, { stdio: "inherit" });
      return true;
    } catch {
      console.warn(`⚠ ${nome} falhou (tentativa ${i} de ${tentativas}).`);
      if (i < tentativas) await esperar(10_000);
    }
  }
  console.warn(`⚠ ${nome} não foi concluído; o build continua. Se houver migração nova, faça Redeploy mais tarde.`);
  return false;
}

if (!process.env.DATABASE_URL) {
  console.warn("⚠ DATABASE_URL não definida: pulando migrações e dados de exemplo.");
} else {
  await tentar("Migração do banco", "npx prisma migrate deploy");
  await tentar("Dados de exemplo", "npx tsx prisma/seed.ts", 2);
}
