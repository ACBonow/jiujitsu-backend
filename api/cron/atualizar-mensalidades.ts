import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/config/database';
import { format, setDate, endOfMonth } from 'date-fns';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verificar se é uma requisição autorizada (do Vercel Cron)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const hoje = new Date();

    // 1. Atualizar mensalidades vencidas para status ATRASADO
    const mensalidadesAtrasadas = await prisma.mensalidade.updateMany({
      where: {
        status: 'PENDENTE',
        dataVencimento: { lt: hoje },
      },
      data: { status: 'ATRASADO' },
    });

    // 2. Verificar alunos com mensalidades atrasadas e atualizar status
    const alunosInadimplentes = await prisma.mensalidade.findMany({
      where: {
        status: 'ATRASADO',
      },
      select: {
        matricula: {
          select: {
            alunoId: true,
          },
        },
      },
      distinct: ['matriculaId'],
    });

    const alunoIds = alunosInadimplentes.map((m) => m.matricula.alunoId);

    if (alunoIds.length > 0) {
      await prisma.aluno.updateMany({
        where: {
          id: { in: alunoIds },
          status: 'ATIVO',
        },
        data: { status: 'INADIMPLENTE' },
      });
    }

    // 3. Gerar mensalidades do mês atual se estiver no dia 25 ou depois
    let mensalidadesGeradas = 0;
    if (hoje.getDate() >= 25) {
      const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      const mesReferencia = format(proximoMes, 'yyyy-MM');

      const matriculasAtivas = await prisma.matricula.findMany({
        where: { status: 'ATIVA' },
        select: {
          id: true,
          valorFinal: true,
          diaVencimento: true,
        },
      });

      for (const matricula of matriculasAtivas) {
        const existente = await prisma.mensalidade.findUnique({
          where: {
            matriculaId_mesReferencia: {
              matriculaId: matricula.id,
              mesReferencia,
            },
          },
        });

        if (!existente) {
          let dataVencimento = setDate(proximoMes, matricula.diaVencimento);
          const ultimoDia = endOfMonth(proximoMes).getDate();
          if (matricula.diaVencimento > ultimoDia) {
            dataVencimento = endOfMonth(proximoMes);
          }

          await prisma.mensalidade.create({
            data: {
              matriculaId: matricula.id,
              mesReferencia,
              valor: matricula.valorFinal,
              dataVencimento,
              status: 'PENDENTE',
            },
          });
          mensalidadesGeradas++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      mensalidadesAtrasadas: mensalidadesAtrasadas.count,
      alunosInadimplentes: alunoIds.length,
      mensalidadesGeradas,
    });
  } catch (error) {
    console.error('Erro ao atualizar mensalidades:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
