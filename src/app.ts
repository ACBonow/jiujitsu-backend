import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './shared/middlewares/error-handler.middleware';
import { apiLimiter } from './shared/middlewares/rate-limit.middleware';
import authRoutes from './modules/auth/auth.routes';
import academiasRoutes from './modules/academias/academias.routes';
import alunosRoutes from './modules/alunos/alunos.routes';
import professoresRoutes from './modules/professores/professores.routes';
import aulasRoutes from './modules/aulas/aulas.routes';
import presencasRoutes from './modules/presencas/presencas.routes';
import reservasRoutes from './modules/reservas/reservas.routes';
import graduacoesRoutes from './modules/graduacoes/graduacoes.routes';
import financeiroRoutes from './modules/financeiro/financeiro.routes';

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API - Sistema de Gestão de Academias de Jiu-Jitsu',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/academias', academiasRoutes);
app.use('/api/alunos', alunosRoutes);
app.use('/api/professores', professoresRoutes);
app.use('/api/aulas', aulasRoutes);
app.use('/api/presencas', presencasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/graduacoes', graduacoesRoutes);
app.use('/api/financeiro', financeiroRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path,
  });
});

// Error handler (deve ser o último middleware)
app.use(errorHandler);

export default app;
