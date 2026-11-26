-- CreateEnum
CREATE TYPE "public"."StatusManual" AS ENUM ('SUSPENSO', 'RESCINDIDO');

-- CreateEnum
CREATE TYPE "public"."TipoAditivo" AS ENUM ('PRAZO', 'VALOR', 'PRAZO_E_VALOR', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."Perfil" AS ENUM ('CONSULTA', 'EDITOR');

-- CreateTable
CREATE TABLE "public"."Setor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,

    CONSTRAINT "Setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Modalidade" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Modalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contrato" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "numeroNormalizado" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "processo" TEXT,
    "modalidadeId" INTEGER,
    "setorId" INTEGER NOT NULL,
    "objeto" TEXT,
    "empresaNome" TEXT,
    "empresaCnpj" TEXT,
    "valorOriginal" BIGINT,
    "dataInicio" DATE,
    "dataFimOriginal" DATE,
    "statusManual" "public"."StatusManual",
    "gestor" TEXT,
    "fiscal" TEXT,
    "observacoes" TEXT,
    "valorAtual" BIGINT,
    "dataFimAtual" DATE,
    "textoBusca" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Aditivo" (
    "id" SERIAL NOT NULL,
    "contratoId" INTEGER NOT NULL,
    "numero" TEXT,
    "tipo" "public"."TipoAditivo" NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT,
    "novoValor" BIGINT,
    "novaDataFim" DATE,

    CONSTRAINT "Aditivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Anexo" (
    "id" SERIAL NOT NULL,
    "contratoId" INTEGER NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "public"."Perfil" NOT NULL DEFAULT 'CONSULTA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setor_nome_key" ON "public"."Setor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Modalidade_nome_key" ON "public"."Modalidade"("nome");

-- CreateIndex
CREATE INDEX "Contrato_ano_idx" ON "public"."Contrato"("ano");

-- CreateIndex
CREATE INDEX "Contrato_setorId_idx" ON "public"."Contrato"("setorId");

-- CreateIndex
CREATE INDEX "Contrato_dataFimAtual_idx" ON "public"."Contrato"("dataFimAtual");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_numeroNormalizado_ano_key" ON "public"."Contrato"("numeroNormalizado", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- AddForeignKey
ALTER TABLE "public"."Contrato" ADD CONSTRAINT "Contrato_modalidadeId_fkey" FOREIGN KEY ("modalidadeId") REFERENCES "public"."Modalidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contrato" ADD CONSTRAINT "Contrato_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "public"."Setor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Aditivo" ADD CONSTRAINT "Aditivo_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "public"."Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Anexo" ADD CONSTRAINT "Anexo_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "public"."Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
