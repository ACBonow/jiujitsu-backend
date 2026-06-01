# ADR-010: Vitest como framework de testes

**Status:** Aceito

## Contexto

Ambos os repositórios usam TypeScript e precisam de um framework de testes que:
- Suporte TypeScript nativamente (sem transformação lenta)
- Seja compatível com ESM
- Tenha API similar ao Jest (reduz curva de aprendizado)
- Funcione bem com Vite/Next.js no frontend

## Decisão

Usar **Vitest** em ambos os repositórios.

- **Backend**: ambiente `node`, sem jsdom
- **Frontend**: ambiente `jsdom`, com plugin `@vitejs/plugin-react`

Mocks de API no frontend via **MSW (Mock Service Worker)** v2.

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Jest** | Precisa de configuração extra para ESM + TypeScript (ts-jest ou babel-jest). Mais lento no watch mode. |
| **Jest + SWC** | Mais rápido que ts-jest, mas ainda mais complexo de configurar que Vitest. |
| **Mocha + Chai** | API mais verbosa. Sem type-safety nativa. Ecossistema fragmentado. |
| **Playwright (apenas e2e)** | Complementar ao Vitest, não substituto. E2E é uma fase futura. |

## Consequências

**Vantagens:**
- Configuração mínima (sem babel, sem ts-jest)
- Compatível com ESM nativamente
- API idêntica ao Jest: `describe`, `it`, `expect`, `vi.mock`, `vi.fn`
- Watch mode extremamente rápido (HMR-style)
- Cobertura de código integrada via `@vitest/coverage-v8`

**Desvantagens:**
- Ecossistema ligeiramente menor que Jest (menos exemplos online)
- Algumas libs de mocking de Jest não funcionam diretamente (ex: `jest.spyOn` → `vi.spyOn`)
- MSW v2 tem API diferente da v1 (breaking change em handlers)
