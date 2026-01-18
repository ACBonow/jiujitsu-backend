import app from './app';
import { config } from './config/env';
import { prisma } from './config/database';

const PORT = config.server.port;

// Testar conexão com o banco
prisma.$connect()
  .then(() => {
    console.log('✅ Conexão com o banco de dados estabelecida');
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    process.exit(1);
  });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📚 Ambiente: ${config.server.env}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Encerrando servidor...');
  await prisma.$disconnect();
  console.log('✅ Conexão com o banco encerrada');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Encerrando servidor...');
  await prisma.$disconnect();
  console.log('✅ Conexão com o banco encerrada');
  process.exit(0);
});
