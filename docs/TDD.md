# TDD — Guia de Testes (Backend)

**Stack de testes:** Vitest · Supertest · Prisma Test Client

---

## 1. Filosofia TDD neste projeto

```
RED   → Escreva o teste que falha (especifica o comportamento desejado)
GREEN → Escreva o mínimo de código para o teste passar
BLUE  → Refatore sem quebrar os testes
```

Para cada nova feature ou correção de bug:
1. Leia o `SDD.md` para entender a regra de negócio
2. Escreva o(s) teste(s) que descrevem o comportamento esperado
3. Rode `npm test` → veja falhar (RED)
4. Implemente o código
5. Rode `npm test` → veja passar (GREEN)
6. Refatore se necessário (BLUE)

---

## 2. Setup de testes

### Instalação

```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

### `vitest.config.ts` (raiz do backend)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', 'prisma'],
    },
    setupFiles: ['./src/tests/setup.ts'],
  },
});
```

### `src/tests/setup.ts`

```typescript
import { prisma } from '../config/database';

// Limpa o banco de testes antes de cada arquivo de teste
beforeAll(async () => {
  // Use um DATABASE_URL separado para testes (ex: jiujitsu_test)
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Scripts no `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Variável de ambiente para testes

```env
# .env.test
DATABASE_URL=postgresql://.../<db_name_test>
JWT_SECRET=test-secret-only
JWT_REFRESH_SECRET=test-refresh-secret-only
```

---

## 3. Estrutura de testes

```
src/
  tests/
    setup.ts                    # Configuração global
    helpers/
      auth.helper.ts            # Gera tokens JWT de teste
      db.helper.ts              # Factories e limpeza de BD
    unit/
      services/
        auth.service.test.ts
        alunos.service.test.ts
        reservas.service.test.ts
        financeiro.service.test.ts
      utils/
        jwt-helper.test.ts
        pagination.test.ts
    integration/
      auth.test.ts
      alunos.test.ts
      aulas.test.ts
      reservas.test.ts
      graduacoes.test.ts
      financeiro.test.ts
      cadastro-publico.test.ts
```

---

## 4. Helpers de teste

### `src/tests/helpers/auth.helper.ts`

```typescript
import jwt from 'jsonwebtoken';
import { Perfil } from '@prisma/client';

interface TokenPayload {
  userId: string;
  perfil: Perfil;
  academiaId?: string;
}

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
}

export function tokenAdmin(userId = 'user-admin-test') {
  return gerarToken({ userId, perfil: Perfil.ADMIN });
}

export function tokenProfessor(userId = 'user-prof-test', academiaId = 'academia-test') {
  return gerarToken({ userId, perfil: Perfil.PROFESSOR, academiaId });
}

export function tokenRecepcionista(userId = 'user-recep-test', academiaId = 'academia-test') {
  return gerarToken({ userId, perfil: Perfil.RECEPCIONISTA, academiaId });
}

export function tokenAluno(userId = 'user-aluno-test', academiaId = 'academia-test') {
  return gerarToken({ userId, perfil: Perfil.ALUNO, academiaId });
}
```

### `src/tests/helpers/db.helper.ts`

```typescript
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';

export async function limparBanco() {
  // Ordem respeitando FK constraints
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

export async function criarAcademia(dados?: Partial<{ nome: string; ativo: boolean }>) {
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
      perfil: 'ADMIN',
      pessoaId: pessoa.id,
      academiaId,
    },
  });
}

export async function criarAluno(academiaId: string, dados?: Record<string, unknown>) {
  const pessoa = await prisma.pessoa.create({
    data: {
      nome: 'Aluno Teste',
      email: `aluno-${Date.now()}@teste.com`,
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
      perfil: 'ALUNO',
      pessoaId: pessoa.id,
      academiaId,
    },
  });
  return { aluno, pessoa, usuario };
}
```

---

## 5. Padrões de teste

### 5.1 Teste de integração (rota HTTP)

```typescript
// src/tests/integration/alunos.test.ts
import request from 'supertest';
import app from '../../app';
import { limparBanco, criarAcademia, criarAluno } from '../helpers/db.helper';
import { tokenAdmin, tokenRecepcionista } from '../helpers/auth.helper';

describe('Alunos API', () => {
  let academiaId: string;

  beforeEach(async () => {
    await limparBanco();
    const academia = await criarAcademia();
    academiaId = academia.id;
  });

  describe('GET /api/alunos', () => {
    it('retorna lista paginada de alunos para ADMIN', async () => {
      await criarAluno(academiaId);
      await criarAluno(academiaId);

      const res = await request(app)
        .get('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app).get('/api/alunos');
      expect(res.status).toBe(401);
    });

    it('filtra por status ATIVO', async () => {
      await criarAluno(academiaId, { status: 'ATIVO' });
      await criarAluno(academiaId, { status: 'INATIVO' });

      const res = await request(app)
        .get('/api/alunos?status=ATIVO')
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('ATIVO');
    });
  });

  describe('POST /api/alunos', () => {
    it('cria aluno com dados válidos', async () => {
      const payload = {
        nome: 'João Silva',
        email: 'joao@teste.com',
        dataNascimento: '2000-05-15',
        sexo: 'MASCULINO',
      };

      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.pessoa.nome).toBe('João Silva');
      expect(res.body.data.faixa).toBe('BRANCA');
    });

    it('retorna 400 quando nome está ausente', async () => {
      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ email: 'teste@teste.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('exige nomeResponsavel para menores de 18', async () => {
      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({
          nome: 'Criança Silva',
          dataNascimento: '2020-01-01', // menor de 18
          sexo: 'MASCULINO',
          // nomeResponsavel ausente
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('nomeResponsavel');
    });
  });
});
```

### 5.2 Teste unitário de service

```typescript
// src/tests/unit/services/reservas.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservasService } from '../../../modules/reservas/reservas.service';

describe('ReservasService', () => {
  let service: ReservasService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findReserva: vi.fn(),
      createReserva: vi.fn(),
      countReservasConfirmadas: vi.fn(),
      updateReserva: vi.fn(),
    };
    service = new ReservasService(mockRepo);
  });

  describe('criarReserva', () => {
    it('cria reserva CONFIRMADA quando há vaga', async () => {
      mockRepo.countReservasConfirmadas.mockResolvedValue(5);
      mockRepo.createReserva.mockResolvedValue({ id: '1', status: 'CONFIRMADA' });

      const resultado = await service.criarReserva({
        aulaId: 'aula-1',
        alunoId: 'aluno-1',
        limiteAlunos: 10,
      });

      expect(resultado.status).toBe('CONFIRMADA');
      expect(mockRepo.createReserva).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMADA' })
      );
    });

    it('cria reserva ESPERA quando aula está cheia', async () => {
      mockRepo.countReservasConfirmadas.mockResolvedValue(10);
      mockRepo.createReserva.mockResolvedValue({ id: '2', status: 'ESPERA' });

      const resultado = await service.criarReserva({
        aulaId: 'aula-1',
        alunoId: 'aluno-2',
        limiteAlunos: 10,
      });

      expect(resultado.status).toBe('ESPERA');
    });

    it('cria reserva CONFIRMADA quando limiteAlunos é null (sem limite)', async () => {
      mockRepo.createReserva.mockResolvedValue({ id: '3', status: 'CONFIRMADA' });

      const resultado = await service.criarReserva({
        aulaId: 'aula-1',
        alunoId: 'aluno-3',
        limiteAlunos: null,
      });

      expect(resultado.status).toBe('CONFIRMADA');
      expect(mockRepo.countReservasConfirmadas).not.toHaveBeenCalled();
    });
  });
});
```

### 5.3 Teste de autenticação

```typescript
// src/tests/integration/auth.test.ts
import request from 'supertest';
import app from '../../app';
import { limparBanco, criarUsuarioAdmin } from '../helpers/db.helper';

describe('Auth API', () => {
  beforeEach(async () => {
    await limparBanco();
    await criarUsuarioAdmin();
  });

  describe('POST /api/auth/login', () => {
    it('retorna tokens com credenciais válidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'senha123' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('retorna 401 com senha incorreta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'errada' });

      expect(res.status).toBe(401);
    });

    it('retorna 401 com email inexistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'naoexiste@teste.com', senha: 'senha123' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('retorna usuário autenticado com token válido', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'senha123' });

      const { accessToken } = login.body.data;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@teste.com');
    });
  });
});
```

---

## 6. Regras de negócio críticas a cobrir com TDD

Estas são as regras do `SDD.md` que **devem ter testes antes da implementação**:

### Reservas (alta complexidade)
- [ ] Reserva criada como CONFIRMADA quando há vaga disponível
- [ ] Reserva criada como ESPERA quando aula está cheia
- [ ] Reserva CONFIRMADA expira após `CONFIRMACAO_RESERVA_MINUTOS`
- [ ] Próximo da fila é promovido quando reserva CONFIRMADA expira
- [ ] Aluno com `faltasReservas >= LIMITE_FALTAS_RESERVA` não pode criar nova reserva
- [ ] Cancelamento de reserva CONFIRMADA libera vaga para fila

### Graduações (IBJJF)
- [ ] Adulto não pode receber faixa Kids (CINZA, AMARELA, LARANJA, VERDE)
- [ ] Progressão de graus: 0 → 4 (ou 0 → 6 para faixa preta)
- [ ] Registro de graduação zera `aulasDesdePromocao`
- [ ] Histórico de graduações é append-only

### Financeiro
- [ ] Mensalidade gerada apenas uma vez por `(matriculaId, mesReferencia)`
- [ ] `dataVencimento` = dia `diaVencimento` da Matrícula no mês corrente
- [ ] Mensalidade PAGO não pode ser revertida para PENDENTE
- [ ] Aluno marcado INADIMPLENTE quando tem mensalidade ATRASADO

### Menores de 18
- [ ] `nomeResponsavel` obrigatório quando `dataNascimento` indica < 18 anos
- [ ] `telefoneResponsavel` obrigatório junto com `nomeResponsavel`

### Presenças
- [ ] Não pode registrar presença em aula AGENDADA (só EM_ANDAMENTO ou CONCLUIDA)
- [ ] UNIQUE(aulaId, alunoId) validado antes de inserir
- [ ] Registro de presença incrementa `aulasDesdePromocao`

---

## 7. Comandos úteis

```bash
# Rodar todos os testes
npm test

# Modo watch (rerun automático)
npm run test:watch

# Com cobertura de código
npm run test:coverage

# Apenas um arquivo
npx vitest run src/tests/integration/alunos.test.ts

# Apenas testes com determinado nome
npx vitest run -t "cria reserva CONFIRMADA"
```

---

## 8. Metas de cobertura

| Camada | Meta |
|--------|------|
| Services (lógica de negócio) | ≥ 90% |
| Controllers | ≥ 80% |
| Utils/Helpers | ≥ 85% |
| Integração (rotas) | Todos os happy paths + erros comuns |
