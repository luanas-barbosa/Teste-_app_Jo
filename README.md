# Contratos de Licitação

App web para consultar e cadastrar contratos de licitação: busca rápida, filtros, lista ou cards, e ficha completa de cada contrato.

## Etapas

- [x] **Etapa 1**: modelo de dados, formulário, busca com filtros (lista e cards) e ficha do contrato
- [ ] Etapa 2: importação de planilha (.xlsx / .csv)
- [ ] Etapa 3: refinamentos da ficha do contrato e anexo PDF
- [ ] Etapa 4: painel com gráficos
- [ ] Etapa 5: login, perfis e exportação para .xlsx

## Publicar na Vercel (grátis)

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório.
2. **Antes de clicar em Deploy**, abra a aba **Storage** do projeto (ou, se ainda não houver projeto, clique em Deploy, deixe falhar e volte depois) → **Create Database** → **Neon (Postgres)** → plano **Free** → conecte ao projeto.
3. Vá em **Deployments** → no último deploy, **⋯ → Redeploy**.

No primeiro deploy o banco é criado e recebe ~50 contratos de exemplo automaticamente.

## Rodar no computador (para desenvolvedores)

Requer Node 20+ e um Postgres.

```bash
cp .env.example .env   # ajuste as URLs do banco
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

`SEED_FORCE=1 npm run seed` **apaga** os contratos e recria os dados de exemplo.

## Regras de negócio

- **Número + ano** é único. Para comparar, o número é normalizado: `012`, `12` e `012/2025` são o mesmo contrato de 2025.
- **Valor atual** e **fim da vigência atual** vêm do aditivo mais recente que informar novo valor / nova data; senão, valem os originais.
- **Situação**: Suspenso e Rescindido são marcados à mão. Os demais são calculados pelas datas: *A iniciar*, *Vigente*, *Encerrado*.
- **Vence em breve**: contrato vigente cujo fim atual é nos próximos 90 dias.
- A busca ignora maiúsculas/minúsculas e acentos, e procura em número, objeto, empresa, CNPJ, setor, modalidade, gestor, fiscal, observações e aditivos.
