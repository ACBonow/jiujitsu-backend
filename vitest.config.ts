import { defineConfig } from 'vitest/config';

// Config principal: apenas testes unitários (não precisam de banco de dados)
// Para testes de integração: npm run test:integration
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      'node_modules',
      'dist',
      'src/tests/integration/**',  // integração requer banco — rodar separadamente
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', 'prisma', 'scripts', 'api/cron', 'src/tests/integration'],
    },
    setupFiles: ['./src/tests/setup.ts'],
  },
});
