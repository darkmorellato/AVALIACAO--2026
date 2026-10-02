# Painel de Vendas — Avaliação 2026

Dashboard para análise de aproveitamento de avaliações por loja, com gráficos
interativos, tabela detalhada e exportação para PDF.

## 🚀 Funcionalidades

- 📊 **Gráfico de aproveitamento** (%) por loja, com logos sobre as barras
- 📈 **Evolução temporal** com séries contínuas entre renomeações de loja
- 🔀 **Comparativo** de vendas totais × vendas avaliadas
- 📋 **Tabela detalhada** ordenada por aproveitamento, com barra de progresso
- 🌓 **Modo escuro** com detecção da preferência do sistema e persistência
- 📄 **Exportação em PDF** A4 paginado
- 🧭 **Seletor de período** agrupado por ano
- 📱 **Design responsivo**, com suporte a `prefers-reduced-motion`

## 📐 Modelo de dados

Cada loja em cada período declara quatro números:

| Campo | Significado |
|---|---|
| `prev` | Total acumulado de avaliações ao fim do mês anterior |
| `current` | Total acumulado de avaliações ao fim do mês atual |
| `sales` | Vendas realizadas no mês |
| `evaluated` | Avaliações recebidas **no mês** |

Duas invariantes validadas por `npm run audit`:

1. `evaluated === current - prev`
2. `prev` de um mês é igual a `current` do mês imediatamente anterior

O aproveitamento é derivado: `(evaluated / sales) * 100`. Quando `sales` é zero,
a loja aparece como **intervalo** no gráfico de tendência — nunca como zero.

O aproveitamento da **rede** é ponderado por vendas (`soma avaliadas / soma
vendas`), o mesmo cálculo dos cartões do painel — não a média das lojas, que
daria peso igual a uma loja de 32 vendas e a uma de 100.

`evaluated` pode ser negativo quando a plataforma remove avaliações. Nesse caso o
valor é exibido como negativo, sem clamp.

## 📁 Estrutura

```
├── src/
│   ├── App.ts              # Controlador principal
│   ├── AppRefresh.ts       # Orquestra a renderização dos módulos
│   ├── AppState.ts         # Estado do controlador
│   ├── main.ts             # Entry point
│   ├── index.html          # Template
│   ├── charts/             # Gerenciadores e construtores de dados dos gráficos
│   ├── constants/          # CONFIG (período padrão, logos, cores, thresholds)
│   ├── services/           # DataService, EventBus, Logger, PdfExporter, StoreReportPdf
│   ├── styles/             # CSS principal
│   ├── types/              # Contratos TypeScript
│   ├── ui/                 # DarkMode, MetricsPanel, TableRenderer, Dropdown
│   └── utils/              # metrics, validators, dom-utils, theme-helper
├── public/
│   ├── periods.json        # Lista de períodos disponíveis
│   ├── data-YYYY-MM.json   # Dados de cada mês
│   ├── sw.js               # Service worker
│   └── Untitled-*.png      # Logos das lojas
├── scripts/
│   ├── audit-data.js       # Valida as invariantes dos dados
│   ├── verify-trend.js     # Valida a série do gráfico de tendência
│   ├── optimize-logos.js   # Reduz e recomprime os logos
│   └── render-report.js    # Gera o relatório por loja fora do navegador
└── legacy/                 # Código JS anterior, preservado para referência
```

## 🔧 Comandos

```bash
npm install

npm run dev            # Servidor de desenvolvimento
npm run build          # Type-check + build de produção em dist/
npm run preview        # Serve o build
npm run type-check     # Apenas verificação de tipos

npm run audit          # Valida os JSONs de dados
npm run verify:trend   # Valida a série do gráfico de tendência
npm run optimize:logos # Reduz e recomprime os logos (requer ImageMagick)
npm run render:report  # Gera o relatório por loja em .vite-tmp/ para inspeção
```

## 📄 Relatórios em PDF

O painel tem duas exportações:

- **Exportar PDF** — captura a tela do dashboard com html2canvas. Fica igual ao
  site, mas é uma imagem: sem texto pesquisável.
- **Por loja** — gera um documento com jsPDF nativo, uma página por loja. O
  texto é real e pesquisável, e o arquivo tem poucos KB.

O relatório por loja tem uma página de resumo com o ranking do período e, para
cada loja, os indicadores do mês, a comparação com a média histórica e com a
aproveitamento da rede, os 10 meses de histórico e uma leitura em texto.

Para conferir o layout sem abrir a interface:

```bash
npm run render:report           # usa o período 2026-09
npm run render:report 2026-08   # ou outro período
```

## ➕ Adicionando um mês novo

1. Crie `public/data-YYYY-MM.json` com o `label` e as lojas do período.
2. Calcule `evaluated` como `current - prev` e use o `current` do mês anterior
   como `prev` desta loja.
3. Registre o período em `public/periods.json`.
4. Se o mês virar o padrão, atualize `defaultPeriod` em `src/constants/index.ts`
   e o `<link rel="preload">` em `src/index.html`.
5. Rode `npm run audit` e `npm run build`.

### Renomeando uma loja

Não duplique a loja em dois nomes, ou a série do gráfico de tendência se quebra.
Registre o mapeamento antigo → novo em `CONFIG.storeAliases`:

```ts
storeAliases: {
  'DOM PEDRO': 'HONOR',
  'XV': 'XV PRIME',
},
```

O gráfico passa a exibir uma série única e contínua, rotulada com o nome atual.
O `logo` e as `cores` do nome novo devem ser declarados em `CONFIG.storeLogos`
e `CONFIG.colors`.

## ⚙️ Configuração

`src/constants/index.ts` concentra o período padrão, os logos, as paletas de
cores e os thresholds de classificação do aproveitamento. Os thresholds são a
única fonte de verdade usada por `getColorByPercent`.

## 📱 Notas de implantação

O app resolve dados e assets por caminho absoluto (`/periods.json`,
`/data-*.json`, `/sw.js`), então a base do Vite é `/`. Publicar em um subdiretório
exige trocar os caminhos absolutos por relativos em `DataService`, `index.html`
e no registro do service worker.

## 🐛 Solução de problemas

**Mês novo não aparece** — o `periods.json` é servido com estratégia network-first,
então um hard reload resolve. Confirme que `dist/periods.json` contém o período.

**Loja sem logo** — a imagem precisa existir em `public/` com o nome exato
declarado em `CONFIG.storeLogos`. Espaços no nome funcionam, mas evite
caracteres especiais.

**Gráfico não aparece** — verifique o console do navegador. Um `data-*.json`
malformado é rejeitado pelo `DataService` e interrompe a inicialização; rode
`npm run audit` para localizar o problema.
