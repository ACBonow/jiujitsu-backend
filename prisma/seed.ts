import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

async function main() {
  console.log('🌱 Iniciando seeds...');

  // 1. Criar Academia
  const academia = await prisma.academia.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      nome: 'Academia Leão de Judá',
      cnpj: '12345678000190',
      telefone: '(11) 98765-4321',
      email: 'contato@leaodejuda.com.br',
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      ativo: true,
    },
  });

  console.log('✅ Academia criada:', academia.nome);

  // 2. Criar Pessoa Admin
  const pessoaAdmin = await prisma.pessoa.upsert({
    where: { email: 'admin@leaodejuda.com.br' },
    update: {},
    create: {
      nome: 'Carlos Silva',
      email: 'admin@leaodejuda.com.br',
      cpf: '12345678900',
      telefone: '(11) 91234-5678',
      dataNascimento: new Date('1985-05-15'),
      sexo: 'MASCULINO',
    },
  });

  console.log('✅ Pessoa admin criada:', pessoaAdmin.nome);

  // 3. Criar Usuário Admin
  const senhaHashAdmin = await hashPassword('admin123');
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@leaodejuda.com.br' },
    update: {},
    create: {
      email: pessoaAdmin.email!,
      senha: senhaHashAdmin,
      perfil: 'ADMIN',
      pessoaId: pessoaAdmin.id,
      academiaId: academia.id,
      ativo: true,
    },
  });

  console.log('✅ Usuário admin criado:', admin.email);
  console.log('\n📝 Credenciais de teste:');
  console.log('   Email: admin@leaodejuda.com.br');
  console.log('   Senha: admin123');

  console.log('\n✅ Seeds concluídos com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seeds:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
