# Painel de Vendas - Avaliação 2026

Dashboard completo para análise de métricas de avaliações e vendas com gráficos interativos, tabela detalhada e exportação para PDF.

## 🚀 Funcionalidades

- 📊 **Gráficos interativos** (Chart.js): barras de aproveitamento, tendência temporal, comparativo
- 📈 **Métricas principais** com animação de contadores
- 📋 **Tabela detalhada** ordenada por desempenho com barras de progresso
- 🌓 **Modo escuro** (dark mode) com detecção de preferência do sistema
- 📄 **Exportação PDF** de alta qualidade
- 📱 **Design responsivo** e acessível

## 📦 Tecnologias

- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Chart.js** + **chartjs-plugin-datalabels** - Gráficos
- **jsPDF** + **html2canvas** - Exportação PDF
- **CSS moderno** - Variaveis CSS, dark mode, animações

## 📁 Estrutura do Projeto

```
├── src/
│   ├── charts/          # Gerenciadores de gráficos
│   ├── constants/       # Configurações (CONFIG)
│   ├── services/        # DataService, EventBus, Logger, PdfExporter
│   ├── ui/              # DarkMode, MetricsPanel, TableRenderer
│   ├── utils/           # Funções auxiliares (metrics, validators, theme)
│   ├── types/           # Definições TypeScript
│   ├── styles/          # CSS principal
│   ├── App.ts           # Controlador principal
│   ├── main.ts          # Entry point
│   └── index.html       # Template
├── public/              # Arquivos estáticos
│   ├── periods.json
│   ├── data-*.json
│   └── Untitled-*.png   # Logos das lojas
├── dist/                # Build de produção (gerado)
└── legacy/              # Código legado JS (preservado)
```

## 🔧 Instalação

```bash
# Clone o repositório (ou extraia os arquivos)
# Navegue até a pasta do projeto
npm install
```

## ▶️ Execução

### Desenvolvimento (hot-reload)

```bash
npm run dev
```

Abra o navegador em `http://localhost:5173` (porta pode variar).

### Build de produção

```bash
npm run build
```

Os arquivos otimizados serão gerados em `dist/`.

### Preview do build

```bash
npm run preview
```

### Verificação de tipos

```bash
npm run type-check
```

## ⚙️ Configuração

Dados e configurações estão em `public/`:

- `periods.json`: lista de períodos disponíveis
- `data-YYYY-MM.json`: dados de cada mês
- Imagens das lojas: `Untitled-*.png`

Para alterar paletas de cores, logotipos ou período padrão, edite `src/constants/index.ts`.

## 🐛 Solução de Problemas

### Erro ao carregar períodos/dados

Verifique se os arquivos JSON estão em `public/` e acessíveis:
- `http://localhost:5173/periods.json`
- `http://localhost:5173/data-2026-04.json`

### Gráficos não aparecem

- Certifique-se de que o navegador tem suporte a ES modules
- Verifique console do navegador (F12) para erros de JS
- Confirme que os pacotes `chart.js` e `chartjs-plugin-datalabels` estão instalados

### Logos não aparecem

Os arquivos de imagem devem estar em `public/` com os nomes exatos definidos em `CONFIG.storeLogos`. Espaços nos nomes são suportados, mas recomenda-se evitar caracteres especiais.

### Porta em uso

Se a porta 5173 estiver ocupada, o Vite automaticamente usará outra (ex: 5174, 5175). Observe a URL exibida no terminal.

## 📄 Licença

Projeto privado - Avaliação 2026.
