import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/config/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verificar se é uma requisição autorizada (do Vercel Cron)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const agora = new Date();

    // Expirar reservas confirmadas que passaram do tempo de expiração
    const reservasExpiradas = await prisma.reserva.updateMany({
      where: {
        status: 'CONFIRMADA',
        dataExpiracao: { lt: agora },
      },
      data: { status: 'EXPIRADA' },
    });

    // Para cada reserva expirada, promover próximo da fila
    const reservasComExpiracao = await prisma.reserva.findMany({
      where: {
        status: 'EXPIRADA',
        updatedAt: { gte: new Date(agora.getTime() - 60000) }, // Últimos 60 segundos
      },
      select: { aulaId: true },
    });

    const aulasAfetadas = [...new Set(reservasComExpiracao.map((r) => r.aulaId))];

    for (const aulaId of aulasAfetadas) {
      const proximoDaFila = await prisma.reserva.findFirst({
        where: {
          aulaId,
          status: 'ESPERA',
        },
        orderBy: { posicaoFila: 'asc' },
      });

      if (proximoDaFila) {
        await prisma.reserva.update({
          where: { id: proximoDaFila.id },
          data: {
            status: 'CONFIRMADA',
            posicaoFila: null,
            dataConfirmacao: new Date(),
            dataExpiracao: new Date(agora.getTime() + 15 * 60000), // 15 minutos
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${reservasExpiradas.count} reservas expiradas`,
      aulasAfetadas: aulasAfetadas.length,
    });
  } catch (error) {
    console.error('Erro ao expirar reservas:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
