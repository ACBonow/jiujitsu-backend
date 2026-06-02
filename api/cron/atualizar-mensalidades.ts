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

    // 3. Gerar mensalidades do mês corrente para todas as matrículas ativas (idempotente)
    let mensalidadesGeradas = 0;
    const mesReferencia = format(hoje, 'yyyy-MM');
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

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
        const ultimoDia = endOfMonth(primeiroDiaMes).getDate();
        const dia = matricula.diaVencimento > ultimoDia ? ultimoDia : matricula.diaVencimento;
        const dataVencimento = setDate(primeiroDiaMes, dia);

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
