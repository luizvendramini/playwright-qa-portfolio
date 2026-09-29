# Playwright QA Portfolio — QuickPizza

Suíte de automação **Web UI + API** em Playwright e TypeScript contra a aplicação QuickPizza, mantida pela Grafana. Os testes exercitam o site e a API reais; este repositório não sobe uma loja simulada.

## Cenários

- Carregamento da página inicial e disponibilidade da ação principal.
- Login no usuário de demonstração e geração de uma recomendação real.
- Validação dos dados apresentados na recomendação.
- Readiness e conteúdo da API pública.
- Rejeição de chamadas sem autenticação e de credenciais inválidas.
- Consulta autenticada dos catálogos de massas, ingredientes e utensílios.
- Recomendação autenticada respeitando calorias, vegetarianismo e ingredientes excluídos.

Os testes não criam usuários nem enviam avaliações. A conta pública de demonstração indicada na tela de login é `default` / `12345678`; configure `QUICKPIZZA_USERNAME` e `QUICKPIZZA_PASSWORD` para usar outra conta.

## Executar agora contra o QuickPizza público

Requer Node.js 18 ou superior.

```bash
npm install
npx playwright install chromium
npm test
```

O alvo padrão é `https://quickpizza.grafana.com`. Para executar partes da suíte:

```bash
npm run test:ui
npm run test:api
npm run typecheck
npm run report
```

## Executar contra uma instância local

Para evitar depender do serviço público, ou para fazer experimentos de carga maiores, inicie a imagem oficial local do QuickPizza em um terminal:

```bash
npm run quickpizza:local
```

Em outro terminal, aponte a suíte para `http://localhost:3333`:

```bash
QUICKPIZZA_BASE_URL=http://localhost:3333 npm test
```

Também é possível apontar para uma instância sua usando `QUICKPIZZA_BASE_URL`. A suíte Playwright faz poucas interações; não use o serviço público compartilhado para carga alta.

## CI

O GitHub Actions executa checagem de tipos e os cenários de interface e API contra o alvo padrão. Como o serviço público é compartilhado, a suíte evita criar dados persistentes e mantém poucas requisições por execução.

## Estrutura

- `pages/QuickPizzaPage.ts`: ações e seletores da interface QuickPizza.
- `tests/ui/quickpizza.spec.ts`: cenários Web UI.
- `tests/api/quickpizza-api.spec.ts`: cenários de API.
- `utils/quickpizza-auth.ts`: autenticação para cenários protegidos.
- `playwright.config.ts`: browser, reporter e URL configurável do alvo.

## Aplicação-alvo e documentação

- [QuickPizza](https://quickpizza.grafana.com/)
- [Código-fonte e execução local com Docker](https://github.com/grafana/quickpizza)
- [Contrato OpenAPI](https://github.com/grafana/quickpizza/blob/main/quickpizza-openapi.yaml)
