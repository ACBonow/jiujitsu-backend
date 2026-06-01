import { defineConfig } from 'vitest/config';

// Config para testes de integração (requer banco de dados de teste)
// Configurar .env.test antes de rodar — ver docs/SETUP.md seção 8
// Rodar com: npm run test:integration
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/integration/**/*.test.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    // Rodar em sequência para evitar conflitos de banco
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
