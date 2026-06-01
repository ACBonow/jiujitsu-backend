import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import { Perfil, StatusAluno } from '@prisma/client';

export async function limparBanco() {
  await prisma.mensalidade.deleteMany();
  await prisma.matricula.deleteMany();
  await prisma.presenca.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.graduacao.deleteMany();
  await prisma.aula.deleteMany();
  await prisma.templateAula.deleteMany();
  await prisma.cadastroPendente.deleteMany();
  await prisma.professorAcademia.deleteMany();
  await prisma.planoAcademia.deleteMany();
  await prisma.plano.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.aluno.deleteMany();
  await prisma.professor.deleteMany();
  await prisma.pessoa.deleteMany();
  await prisma.academia.deleteMany();
  await prisma.configuracao.deleteMany();
}

export async function criarAcademia(dados?: { nome?: string; ativo?: boolean }) {
  return prisma.academia.create({
    data: { nome: 'Academia Teste', ...dados },
  });
}

export async function criarUsuarioAdmin(academiaId?: string) {
  const pessoa = await prisma.pessoa.create({
    data: { nome: 'Admin Teste', email: 'admin@teste.com' },
  });
  return prisma.usuario.create({
    data: {
      email: 'admin@teste.com',
      senha: await bcrypt.hash('senha123', 10),
      perfil: Perfil.ADMIN,
      pessoaId: pessoa.id,
      academiaId: academiaId ?? null,
    },
  });
}

export async function criarAluno(academiaId: string, dados?: Partial<{ status: StatusAluno; faltasReservas: number }>) {
  const suffix = Date.now() + Math.random();
  const pessoa = await prisma.pessoa.create({
    data: {
      nome: 'Aluno Teste',
      email: `aluno-${suffix}@teste.com`,
      dataNascimento: new Date('2000-01-01'),
    },
  });
  const aluno = await prisma.aluno.create({
    data: { pessoaId: pessoa.id, ...dados },
  });
  const usuario = await prisma.usuario.create({
    data: {
      email: pessoa.email!,
      senha: await bcrypt.hash('senha123', 10),
      perfil: Perfil.ALUNO,
      pessoaId: pessoa.id,
      academiaId,
    },
  });
  return { aluno, pessoa, usuario };
}
