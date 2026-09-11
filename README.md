# Playwright QA Portfolio

Projeto de portfolio de automacao de testes, combinando **testes de interface (Web UI)** e **testes de API** em uma unica suite, com **Playwright + TypeScript**.

## Objetivo

Demonstrar, na pratica, boas praticas de automacao de testes:

- **Page Object Model (POM)** para a camada de UI, isolando seletores e acoes da logica dos testes.
- **Testes deterministicos e independentes**, sem dependencia de sites externos.
- **Suite integrada a CI/CD** via GitHub Actions.
- **Cobertura combinada**: fluxo completo de UI (login, catalogo, carrinho, checkout) e testes de contrato de uma API REST.

## Por que uma "mock-app" local em vez de um site publico de demonstracao?

Sites publicos de demo (usados com frequencia em portfolios de QA) trazem riscos reais para uma suite de testes: podem ficar fora do ar, mudar de layout sem aviso, aplicar rate limiting ou depender de terceiros fora do nosso controle — tudo isso gera flakiness, exatamente o que uma boa estrategia de automacao busca evitar.

Por isso, este projeto inclui uma pequena aplicacao Node nativa (`mock-app/`, sem dependencias de runtime) que sobe localmente (tambem no CI) antes da suite rodar, via `webServer` do Playwright. Isso garante:

- **Zero dependencia externa** — a suite roda igual em qualquer maquina ou pipeline, sem nem precisar de `npm install` para a propria mock-app.
- **Determinismo total** — os dados e o comportamento da aplicacao sao conhecidos e controlados.
- **Testes rapidos e estaveis**, sem depender da disponibilidade de terceiros.

## Estrutura do projeto

```
qa-portfolio/
├── mock-app/               # Aplicacao alvo dos testes (Node http nativo, sem deps): loja fake + API REST
│   └── server.js
├── pages/                  # Page Objects (POM) da camada Web
│   ├── LoginPage.ts
│   ├── ProductsPage.ts
│   ├── CartPage.ts
│   └── CheckoutPage.ts
├── tests/
│   ├── ui/                 # Testes de interface (login, fluxo de compra)
│   └── api/                 # Testes de API (CRUD de produtos)
├── utils/
│   └── test-data.ts         # Massa de dados centralizada
├── playwright.config.ts
└── .github/workflows/playwright.yml
```

## Como rodar localmente

```bash
npm install
npx playwright install --with-deps chromium   # apenas na 1a vez / se necessario
npm test              # roda toda a suite (UI + API)
npm run test:ui        # apenas os testes de interface
npm run test:api       # apenas os testes de API
npm run report          # abre o relatorio HTML da ultima execucao
```

O `playwright.config.ts` sobe a `mock-app` automaticamente antes dos testes (na porta 3000) e a encerra ao final — nao e necessario iniciar o servidor manualmente.

## CI

Todo push/PR na branch `main` dispara o workflow [`playwright.yml`](.github/workflows/playwright.yml), que instala as dependencias, sobe os browsers do Playwright e roda a suite completa, publicando o relatorio HTML como artefato.

## Stack

- [Playwright](https://playwright.dev/) + TypeScript
- Node.js `http` nativo (mock-app, zero dependencias de runtime)
- GitHub Actions (CI)
