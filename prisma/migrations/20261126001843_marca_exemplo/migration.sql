-- AlterTable
ALTER TABLE "public"."Contrato" ADD COLUMN     "exemplo" BOOLEAN NOT NULL DEFAULT false;

-- Marca como exemplo os contratos fictícios criados pelo primeiro deploy
UPDATE "Contrato" SET "exemplo" = true WHERE "empresaNome" IN (
  'Alfa Serviços e Construções Ltda', 'Brasilmed Distribuidora de Medicamentos Ltda', 'Construtora Horizonte S.A.',
  'Nutrir Alimentação Coletiva Ltda', 'Rota Certa Transportes Ltda', 'Vigilância Guardião Ltda',
  'Petro Sul Comércio de Combustíveis Ltda', 'Tecnogov Sistemas Ltda', 'Verde Vivo Ambiental Ltda',
  'Luz & Cia Engenharia Elétrica Ltda', 'Papelaria Escolar Central Ltda', 'Clean Max Higienização Ltda',
  'Palco Brasil Eventos Ltda', 'Sinaliza Engenharia de Tráfego Ltda', 'Oxi Vida Gases Medicinais Ltda',
  'Lar Esperança Associação Beneficente', 'Print Office Soluções Ltda', 'Tributa Consultoria Pública Ltda'
);
