/**
 * Script para verificar e corrigir usuários (PROFESSOR, ADMIN, RECEPCIONISTA) sem senha
 * Gera hash com CPF como senha inicial
 *
 * Executar com: npx tsx scripts/fix-usuarios-sem-senha.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

async function main() {
  console.log('🔍 Verificando usuários sem senha ou com senha inválida...\n');

  // Buscar todos os usuários que são PROFESSOR, ADMIN ou RECEPCIONISTA
  const usuarios = await prisma.usuario.findMany({
    where: {
      perfil: {
        in: ['PROFESSOR', 'ADMIN', 'RECEPCIONISTA'],
      },
    },
    include: {
      pessoa: {
        select: {
          id: true,
          nome: true,
          cpf: true,
          email: true,
        },
      },
    },
  });

  console.log(`📊 Total de usuários encontrados: ${usuarios.length}\n`);

  let corrigidos = 0;
  let semCpf = 0;
  let comSenhaOk = 0;

  for (const usuario of usuarios) {
    // Verificar se tem senha
    if (!usuario.senha || usuario.senha.trim() === '') {
      console.log(`❌ Usuário SEM SENHA: ${usuario.email} (${usuario.perfil})`);

      // Verificar se a pessoa tem CPF
      if (!usuario.pessoa?.cpf) {
        console.log(`   ⚠️  Pessoa sem CPF cadastrado, não é possível gerar senha`);
        semCpf++;
        continue;
      }

      // Gerar hash com CPF
      const cpfLimpo = usuario.pessoa.cpf.replace(/\D/g, '');
      const senhaHash = await hashPassword(cpfLimpo);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senha: senhaHash },
      });

      console.log(`   ✅ Senha gerada com CPF: ${cpfLimpo.substring(0, 3)}***${cpfLimpo.substring(8)}`);
      corrigidos++;
    } else {
      console.log(`✅ Usuário com senha OK: ${usuario.email} (${usuario.perfil})`);
      comSenhaOk++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO:');
  console.log(`   ✅ Usuários com senha OK: ${comSenhaOk}`);
  console.log(`   🔧 Usuários corrigidos: ${corrigidos}`);
  console.log(`   ⚠️  Usuários sem CPF (não corrigidos): ${semCpf}`);
  console.log('='.repeat(60));

  // Verificar professores que deveriam ter usuário mas não têm
  console.log('\n🔍 Verificando professores sem usuário...\n');

  const professoresSemUsuario = await prisma.professor.findMany({
    where: {
      pessoa: {
        usuario: null,
      },
    },
    include: {
      pessoa: {
        select: {
          id: true,
          nome: true,
          cpf: true,
          email: true,
        },
      },
    },
  });

  if (professoresSemUsuario.length > 0) {
    console.log(`⚠️  Encontrados ${professoresSemUsuario.length} professores SEM usuário:\n`);

    for (const prof of professoresSemUsuario) {
      console.log(`   - ${prof.pessoa.nome} (${prof.pessoa.email})`);

      if (!prof.pessoa.cpf || !prof.pessoa.email) {
        console.log(`     ⚠️  Faltando CPF ou email, não é possível criar usuário`);
        continue;
      }

      // Criar usuário para o professor
      const cpfLimpo = prof.pessoa.cpf.replace(/\D/g, '');
      const senhaHash = await hashPassword(cpfLimpo);

      const novoUsuario = await prisma.usuario.create({
        data: {
          email: prof.pessoa.email,
          senha: senhaHash,
          perfil: 'PROFESSOR',
          pessoaId: prof.pessoa.id,
          ativo: true,
        },
      });

      console.log(`     ✅ Usuário criado: ${novoUsuario.email} (senha = CPF)`);
      corrigidos++;
    }
  } else {
    console.log('✅ Todos os professores já possuem usuário.\n');
  }

  console.log('\n✅ Verificação concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
