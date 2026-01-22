/**
 * Script simples para listar usuários
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.findMany({
    include: {
      pessoa: {
        select: {
          nome: true,
          cpf: true,
        },
      },
    },
  });

  console.log('\n📋 LISTA DE USUÁRIOS DO SISTEMA:\n');
  console.log('='.repeat(80));

  for (const u of usuarios) {
    const temSenha = u.senha && u.senha.length > 10;
    const status = temSenha ? '✅' : '❌';
    console.log(`${status} ${u.perfil.padEnd(15)} | ${u.email.padEnd(35)} | ${u.pessoa?.nome || 'N/A'}`);
  }

  console.log('='.repeat(80));
  console.log(`Total: ${usuarios.length} usuários\n`);

  // Verificar professores
  const professores = await prisma.professor.findMany({
    include: {
      pessoa: {
        select: {
          nome: true,
          email: true,
          cpf: true,
          usuario: {
            select: { id: true },
          },
        },
      },
    },
  });

  console.log('\n📋 LISTA DE PROFESSORES:\n');
  console.log('='.repeat(80));

  for (const p of professores) {
    const temUsuario = !!p.pessoa?.usuario;
    const status = temUsuario ? '✅' : '❌';
    console.log(`${status} ${p.pessoa?.nome?.padEnd(30) || 'N/A'} | ${p.pessoa?.email?.padEnd(35) || 'N/A'} | Usuario: ${temUsuario ? 'SIM' : 'NÃO'}`);
  }

  console.log('='.repeat(80));
  console.log(`Total: ${professores.length} professores\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
