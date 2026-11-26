/**
 * Dados de exemplo: ~50 contratos fictícios (2021–2026), 10 setores, várias modalidades.
 * Só roda se o banco estiver vazio. Para forçar: SEED_FORCE=1 npm run seed (APAGA os contratos).
 */
import { prisma } from "../src/lib/db";
import { salvarContrato, type ContratoEntrada } from "../src/lib/salvar";
import { hoje, somarDias } from "../src/lib/datas";

let semente = 20261126;
const rand = () => {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
};
const escolher = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const entre = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

function gerarCnpj(): string {
  const base = Array.from({ length: 8 }, () => entre(0, 9)).join("") + "0001";
  const dv = (b: string, pesos: number[]) => {
    const s = b.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base + d1 + d2;
}

const SETORES: { nome: string; sigla: string; objetos: [string, number, number][] }[] = [
  { nome: "Secretaria de Saúde", sigla: "SMS", objetos: [
    ["Aquisição de medicamentos da atenção básica para as unidades de saúde", 400_000, 2_500_000],
    ["Prestação de serviços de limpeza e higienização hospitalar no Hospital Municipal", 600_000, 1_800_000],
    ["Locação de ambulâncias tipo B com motorista para o SAMU", 900_000, 2_200_000],
    ["Fornecimento de oxigênio medicinal e locação de cilindros", 150_000, 450_000],
    ["Manutenção preventiva e corretiva de equipamentos odontológicos", 80_000, 260_000],
  ]},
  { nome: "Secretaria de Educação", sigla: "SME", objetos: [
    ["Fornecimento de gêneros alimentícios para a merenda escolar", 700_000, 3_000_000],
    ["Transporte escolar de alunos da zona rural", 800_000, 2_400_000],
    ["Aquisição de kits de material escolar para a rede municipal", 300_000, 900_000],
    ["Reforma e ampliação da Escola Municipal Professora Ana Lúcia", 500_000, 1_600_000],
  ]},
  { nome: "Secretaria de Obras e Infraestrutura", sigla: "SMOI", objetos: [
    ["Pavimentação asfáltica e drenagem de vias no Bairro Jardim das Flores", 1_500_000, 6_000_000],
    ["Recapeamento de vias urbanas na região central", 900_000, 3_500_000],
    ["Construção de ponte de concreto sobre o Córrego Fundo", 1_200_000, 4_000_000],
    ["Manutenção da iluminação pública com fornecimento de luminárias LED", 400_000, 1_500_000],
  ]},
  { nome: "Secretaria de Administração", sigla: "SMA", objetos: [
    ["Locação de impressoras multifuncionais com fornecimento de suprimentos", 90_000, 300_000],
    ["Serviço de vigilância patrimonial armada e desarmada nos prédios públicos", 700_000, 1_900_000],
    ["Fornecimento de combustível para a frota municipal", 500_000, 1_700_000],
    ["Licenciamento de sistema integrado de gestão pública", 250_000, 800_000],
  ]},
  { nome: "Secretaria de Assistência Social", sigla: "SMAS", objetos: [
    ["Aquisição de cestas básicas para famílias em vulnerabilidade", 200_000, 700_000],
    ["Serviço de acolhimento institucional para crianças e adolescentes", 300_000, 900_000],
    ["Fornecimento de refeições para o Restaurante Popular", 400_000, 1_200_000],
  ]},
  { nome: "Secretaria de Meio Ambiente", sigla: "SMMA", objetos: [
    ["Coleta e transporte de resíduos sólidos urbanos", 1_800_000, 5_500_000],
    ["Poda e supressão de árvores em áreas públicas", 120_000, 400_000],
    ["Recuperação de nascentes e áreas de preservação permanente", 150_000, 500_000],
  ]},
  { nome: "Secretaria da Fazenda", sigla: "SMF", objetos: [
    ["Consultoria para recuperação de créditos tributários", 100_000, 350_000],
    ["Atualização da planta genérica de valores do IPTU", 180_000, 520_000],
  ]},
  { nome: "Secretaria de Cultura e Turismo", sigla: "SMCT", objetos: [
    ["Contratação de show artístico para a festa de aniversário da cidade", 80_000, 350_000],
    ["Locação de palco, som e iluminação para eventos culturais", 60_000, 220_000],
    ["Restauração do Teatro Municipal", 400_000, 1_300_000],
  ]},
  { nome: "Secretaria de Esporte e Lazer", sigla: "SMEL", objetos: [
    ["Reforma do ginásio poliesportivo do Bairro São José", 250_000, 900_000],
    ["Aquisição de materiais esportivos para escolinhas municipais", 40_000, 150_000],
  ]},
  { nome: "Secretaria de Mobilidade Urbana", sigla: "SEMOB", objetos: [
    ["Implantação e manutenção de sinalização viária horizontal e vertical", 300_000, 1_100_000],
    ["Operação do sistema de estacionamento rotativo", 200_000, 600_000],
  ]},
];

const MODALIDADES = ["Pregão Eletrônico", "Pregão Presencial", "Concorrência", "Tomada de Preços", "Dispensa de Licitação", "Inexigibilidade", "Credenciamento"];

const EMPRESAS = [
  "Alfa Serviços e Construções Ltda", "Brasilmed Distribuidora de Medicamentos Ltda", "Construtora Horizonte S.A.",
  "Nutrir Alimentação Coletiva Ltda", "Rota Certa Transportes Ltda", "Vigilância Guardião Ltda",
  "Petro Sul Comércio de Combustíveis Ltda", "Tecnogov Sistemas Ltda", "Verde Vivo Ambiental Ltda",
  "Luz & Cia Engenharia Elétrica Ltda", "Papelaria Escolar Central Ltda", "Clean Max Higienização Ltda",
  "Palco Brasil Eventos Ltda", "Sinaliza Engenharia de Tráfego Ltda", "Oxi Vida Gases Medicinais Ltda",
  "Lar Esperança Associação Beneficente", "Print Office Soluções Ltda", "Tributa Consultoria Pública Ltda",
];
const CNPJS = new Map(EMPRESAS.map((e) => [e, gerarCnpj()]));
const PESSOAS = ["Maria Aparecida Souza", "João Carlos Pereira", "Ana Paula Ribeiro", "Carlos Eduardo Lima", "Fernanda Oliveira", "Ricardo Alves", "Juliana Costa", "Paulo Henrique Martins", "Luciana Ferreira", "Roberto Nascimento"];

function empresaPara(objeto: string): string {
  const o = objeto.toLowerCase();
  if (o.includes("medicamento")) return "Brasilmed Distribuidora de Medicamentos Ltda";
  if (o.includes("oxigênio")) return "Oxi Vida Gases Medicinais Ltda";
  if (o.includes("limpeza")) return "Clean Max Higienização Ltda";
  if (o.includes("merenda") || o.includes("refeições") || o.includes("cestas")) return "Nutrir Alimentação Coletiva Ltda";
  if (o.includes("transporte escolar") || o.includes("ambulâncias")) return "Rota Certa Transportes Ltda";
  if (o.includes("vigilância")) return "Vigilância Guardião Ltda";
  if (o.includes("combustível")) return "Petro Sul Comércio de Combustíveis Ltda";
  if (o.includes("resíduos") || o.includes("poda") || o.includes("nascentes")) return "Verde Vivo Ambiental Ltda";
  if (o.includes("iluminação")) return "Luz & Cia Engenharia Elétrica Ltda";
  if (o.includes("material escolar") || o.includes("materiais esportivos")) return "Papelaria Escolar Central Ltda";
  if (o.includes("show") || o.includes("palco")) return "Palco Brasil Eventos Ltda";
  if (o.includes("sinalização") || o.includes("estacionamento")) return "Sinaliza Engenharia de Tráfego Ltda";
  if (o.includes("sistema")) return "Tecnogov Sistemas Ltda";
  if (o.includes("acolhimento")) return "Lar Esperança Associação Beneficente";
  if (o.includes("impressoras")) return "Print Office Soluções Ltda";
  if (o.includes("tributários") || o.includes("iptu")) return "Tributa Consultoria Pública Ltda";
  if (o.includes("pavimentação") || o.includes("recapeamento") || o.includes("ponte")) return "Construtora Horizonte S.A.";
  return "Alfa Serviços e Construções Ltda";
}

function modalidadePara(objeto: string): string {
  const o = objeto.toLowerCase();
  if (o.includes("show")) return "Inexigibilidade";
  if (o.includes("acolhimento")) return "Credenciamento";
  if (o.includes("pavimentação") || o.includes("ponte") || o.includes("coleta") || o.includes("restauração")) return "Concorrência";
  if (o.includes("reforma")) return escolher(["Concorrência", "Tomada de Preços"]);
  if (o.includes("consultoria") || o.includes("nascentes")) return escolher(["Dispensa de Licitação", "Tomada de Preços"]);
  return escolher(["Pregão Eletrônico", "Pregão Eletrônico", "Pregão Eletrônico", "Pregão Presencial"]);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const reais = (n: number) => n.toFixed(2).replace(".", ",");

async function main() {
  const existentes = await prisma.contrato.count();
  if (existentes > 0 && !process.env.SEED_FORCE) {
    console.log(`Banco já tem ${existentes} contratos — dados de exemplo não foram criados.`);
    return;
  }
  if (process.env.SEED_FORCE) await prisma.contrato.deleteMany();

  for (const s of SETORES) await prisma.setor.upsert({ where: { nome: s.nome }, update: { sigla: s.sigla }, create: { nome: s.nome, sigla: s.sigla } });
  for (const m of MODALIDADES) await prisma.modalidade.upsert({ where: { nome: m }, update: {}, create: { nome: m } });
  const setores = await prisma.setor.findMany();
  const modalidades = await prisma.modalidade.findMany();

  const ref = hoje();
  const contadorAno = new Map<number, number>();
  const porAno: Record<number, number> = { 2021: 6, 2022: 8, 2023: 9, 2024: 10, 2025: 11, 2026: 8 };
  let i = 0;
  // Todos os objetos aparecem pelo menos uma vez, em ordem embaralhada
  const ORDEM = SETORES.flatMap((s) => s.objetos.map((o) => ({ s, o })))
    .map((x) => ({ x, r: rand() })).sort((a, b) => a.r - b.r).map(({ x }) => x);

  for (const [anoStr, qtd] of Object.entries(porAno)) {
    const ano = Number(anoStr);
    for (let k = 0; k < qtd; k++, i++) {
      const { s, o } = ORDEM[i % ORDEM.length];
      const [objeto, vmin, vmax] = o;
      const n = (contadorAno.get(ano) ?? 0) + entre(1, 6);
      contadorAno.set(ano, n);

      const inicio = new Date(Date.UTC(ano, entre(0, 11), entre(1, 28)));
      const meses = escolher([6, 12, 12, 12, 24]);
      let fim = new Date(inicio); fim.setUTCMonth(fim.getUTCMonth() + meses); fim = somarDias(fim, -1);

      // Garante alguns vencendo nos próximos 90 dias
      if ((k === 0 && ano >= 2024) || (k === 1 && ano >= 2025)) fim = somarDias(ref, entre(10, 85));

      const valor = Math.round((vmin + rand() * (vmax - vmin)) / 100) * 100 + entre(0, 99) / 100;
      const empresa = empresaPara(objeto);

      const aditivos: ContratoEntrada["aditivos"] = [];
      let fimAtual = fim;
      if (fim < somarDias(ref, 120) && fim > new Date(Date.UTC(2022, 0, 1)) && rand() < 0.45) {
        const novoFim = new Date(fim); novoFim.setUTCMonth(novoFim.getUTCMonth() + 12);
        const comValor = rand() < 0.5;
        aditivos.push({
          numero: "1º Termo Aditivo",
          tipo: comValor ? "PRAZO_E_VALOR" : "PRAZO",
          data: iso(somarDias(fim, -entre(10, 40))),
          descricao: comValor
            ? "Prorrogação por mais 12 meses com reajuste pelo IPCA acumulado do período."
            : "Prorrogação da vigência por mais 12 meses, mantidas as demais condições.",
          novoValor: comValor ? reais(valor * (2 + 0.045 + rand() * 0.03)) : "",
          novaDataFim: iso(novoFim),
        });
        fimAtual = novoFim;
        if (rand() < 0.3 && novoFim > ref) {
          aditivos.push({
            numero: "2º Termo Aditivo",
            tipo: "VALOR",
            data: iso(somarDias(fim, entre(60, 200))),
            descricao: "Acréscimo quantitativo de 20% do valor inicial, conforme art. 125 da Lei 14.133/2021.",
            novoValor: reais(valor * 2.25),
          });
        }
      }

      let statusManual = "";
      let observacoes = escolher([
        "", "", "",
        "Contrato com garantia contratual de 5% apresentada em seguro-garantia.",
        "Pagamentos mensais mediante medição atestada pelo fiscal.",
        "Empresa notificada em razão de atraso na entrega de parte dos itens.",
        "Recursos de convênio estadual.",
        "Ata de registro de preços vinculada.",
      ]);
      if (fimAtual > ref && rand() < 0.08) {
        statusManual = "SUSPENSO";
        observacoes = "Execução suspensa por ordem da secretaria até a conclusão de análise técnica.";
      } else if (fimAtual > ref && rand() < 0.06) {
        statusManual = "RESCINDIDO";
        observacoes = "Contrato rescindido unilateralmente por descumprimento de cláusulas contratuais.";
      }

      const setor = setores.find((x) => x.nome === s.nome)!;
      const nomeMod = modalidadePara(objeto);
      const modalidade = modalidades.find((x) => x.nome === nomeMod);
      if (!modalidade) throw new Error(`modalidade ${nomeMod} / ${JSON.stringify(modalidades.map((m) => m.nome))}`);

      const r = await salvarContrato({
        numero: String(n).padStart(3, "0"),
        ano: String(ano),
        processo: `${entre(100, 2999)}/${ano}`,
        modalidadeId: String(modalidade.id),
        setorId: String(setor.id),
        objeto,
        empresaNome: empresa,
        empresaCnpj: CNPJS.get(empresa)!,
        valor: reais(valor),
        dataInicio: iso(inicio),
        dataFim: iso(fim),
        statusManual,
        gestor: escolher(PESSOAS),
        fiscal: escolher(PESSOAS),
        observacoes,
        aditivos,
      });
      if (!r.ok) console.warn("Falha no contrato de exemplo:", r.erros);
    }
  }
  console.log(`Dados de exemplo criados: ${await prisma.contrato.count()} contratos.`);
}

main().finally(() => prisma.$disconnect());
