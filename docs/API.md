# API Reference — Sistema de Gestão de Academias de Jiu-Jitsu

**Base URL:** `https://jiujitsu-backend.vercel.app`  
**Formato de requisição:** `application/json`  
**Autenticação:** `Authorization: Bearer <accessToken>` (exceto rotas marcadas como Público)

---

## Formato padrão de resposta

### Sucesso
```json
{
  "success": true,
  "data": { ... },
  "pagination": {           // Apenas em listagens
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "..."          // Opcional
}
```

### Erro
```json
{
  "success": false,
  "message": "Descrição do erro",
  "errors": {               // Opcional — erros de validação por campo
    "nome": ["Nome é obrigatório"],
    "email": ["Email inválido"]
  }
}
```

### Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK — requisição bem-sucedida |
| 201 | Created — recurso criado |
| 400 | Bad Request — dados inválidos |
| 401 | Unauthorized — token ausente ou inválido |
| 403 | Forbidden — perfil sem permissão |
| 404 | Not Found — recurso não encontrado |
| 409 | Conflict — violação de unicidade (email duplicado, etc.) |
| 422 | Unprocessable Entity — regra de negócio violada |
| 429 | Too Many Requests — rate limit atingido |
| 500 | Internal Server Error |

---

## Parâmetros de paginação (listagens)

```
GET /api/alunos?page=2&limit=20
```

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| page | number | 1 | Página atual |
| limit | number | 20 | Itens por página (max: 100) |

---

## Auth `/api/auth`

### POST /api/auth/login
**Público**

```json
// Request
{
  "email": "admin@academia.com",
  "senha": "minhasenha123"
}

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "clx...",
      "email": "admin@academia.com",
      "perfil": "ADMIN",
      "academiaId": null,
      "pessoa": { "id": "clx...", "nome": "Admin Silva" }
    }
  }
}

// Erro 401: credenciais inválidas
// Erro 429: rate limit de login (5 tentativas/15min por IP)
```

---

### POST /api/auth/refresh
**Público**

```json
// Request
{ "refreshToken": "eyJhbGci..." }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."  // Novo refresh token (rotação)
  }
}

// Erro 401: refresh token inválido ou expirado
```

---

### POST /api/auth/logout
**Autenticado**

```json
// Request: sem body
// Response 200
{ "success": true, "message": "Logout realizado com sucesso" }
```

---

### GET /api/auth/me
**Autenticado**

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "clx...",
    "email": "admin@academia.com",
    "perfil": "ADMIN",
    "academiaId": null,
    "pessoa": {
      "id": "clx...",
      "nome": "Admin Silva",
      "telefone": "11999999999",
      "email": "admin@academia.com"
    }
  }
}
```

---

### POST /api/auth/change-password
**Autenticado**

```json
// Request
{
  "senhaAtual": "senha123",
  "novaSenha": "novaSenha456"
}

// Response 200
{ "success": true, "message": "Senha alterada com sucesso" }

// Erro 400: senhaAtual incorreta
// Erro 400: novaSenha muito curta (mínimo 8 caracteres)
```

---

## Academias `/api/academias`

### GET /api/academias
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

```
GET /api/academias?page=1&limit=20&ativo=true
```

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "nome": "Academia Central",
      "cnpj": "12.345.678/0001-90",
      "telefone": "11999999999",
      "email": "contato@academia.com",
      "cidade": "São Paulo",
      "estado": "SP",
      "ativo": true
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/academias
**Roles:** ADMIN

```json
// Request
{
  "nome": "Academia Norte",              // obrigatório
  "cnpj": "12.345.678/0002-71",         // opcional, único
  "telefone": "11988887777",
  "email": "norte@academia.com",
  "logradouro": "Rua das Flores",
  "numero": "123",
  "complemento": "Sala 2",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01310-100"
}

// Response 201
{ "success": true, "data": { "id": "clx...", "nome": "Academia Norte", ... } }

// Erro 409: CNPJ ou email já cadastrado
```

---

### GET /api/academias/:id
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

```json
// Response 200
{ "success": true, "data": { "id": "clx...", "nome": "Academia Central", ... } }

// Erro 404: academia não encontrada
```

---

### PUT /api/academias/:id
**Roles:** ADMIN — mesmos campos do POST

---

### DELETE /api/academias/:id
**Roles:** ADMIN  
Soft delete: define `ativo = false`.

```json
// Response 200
{ "success": true, "message": "Academia desativada com sucesso" }
```

---

## Alunos `/api/alunos`

### GET /api/alunos
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

```
GET /api/alunos?page=1&limit=20&status=ATIVO&faixa=AZUL&academiaId=clx...&busca=João
```

| Filtro | Valores |
|--------|---------|
| status | ATIVO, INATIVO, INADIMPLENTE |
| faixa | BRANCA, AZUL, ROXA, MARROM, PRETA, ... |
| academiaId | ID da academia |
| busca | string (busca por nome) |

---

### POST /api/alunos
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

```json
// Request
{
  // Dados da Pessoa
  "nome": "João Silva",                  // obrigatório
  "email": "joao@email.com",            // único
  "cpf": "123.456.789-00",              // único
  "telefone": "11999999999",
  "dataNascimento": "2000-05-15",        // ISO 8601
  "sexo": "MASCULINO",                   // MASCULINO | FEMININO

  // Endereço (opcional)
  "logradouro": "Rua das Flores",
  "numero": "123",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01310-100",

  // Dados do Aluno
  "nomeResponsavel": "Maria Silva",      // obrigatório se menor de 18
  "telefoneResponsavel": "11988887777", // obrigatório com nomeResponsavel
  "peso": 75.5,
  "academiaId": "clx...",               // obrigatório
  "professorResponsavelId": "clx...",   // opcional
  "observacoes": "..."
}

// Response 201
{
  "success": true,
  "data": {
    "id": "clx...",
    "pessoaId": "clx...",
    "faixa": "BRANCA",
    "graus": 0,
    "status": "ATIVO",
    "pessoa": { "nome": "João Silva", "email": "joao@email.com" }
  }
}

// Erro 400: nomeResponsavel ausente para menor de 18
// Erro 409: email ou CPF já cadastrado
```

---

### PATCH /api/alunos/:id/status
**Roles:** ADMIN, RECEPCIONISTA

```json
// Request
{ "status": "INATIVO" }  // ATIVO | INATIVO | INADIMPLENTE

// Response 200
{ "success": true, "data": { "id": "clx...", "status": "INATIVO" } }
```

---

### GET /api/alunos/:id/presencas
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

```
GET /api/alunos/:id/presencas?page=1&limit=20
```

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "dataRegistro": "2026-05-31T10:00:00Z",
      "aula": {
        "id": "clx...",
        "dataHora": "2026-05-31T09:00:00Z",
        "categoria": "ADULTO_MISTO",
        "professor": { "pessoa": { "nome": "Prof. Carlos" } }
      }
    }
  ],
  "pagination": { ... }
}
```

---

## Aulas `/api/aulas`

### POST /api/aulas/gerar
**Roles:** ADMIN, PROFESSOR

Gera aulas para um período a partir dos templates ativos.

```json
// Request
{
  "academiaId": "clx...",
  "dataInicio": "2026-06-01",
  "dataFim": "2026-06-30"
}

// Response 201
{
  "success": true,
  "data": {
    "criadas": 22,
    "ignoradas": 8    // Aulas que já existiam no período
  },
  "message": "22 aulas geradas com sucesso"
}
```

---

### PATCH /api/aulas/:id/iniciar
**Roles:** ADMIN, PROFESSOR

```json
// Response 200
{ "success": true, "data": { "id": "clx...", "status": "EM_ANDAMENTO" } }

// Erro 422: aula não está em status AGENDADA
```

---

### PATCH /api/aulas/:id/concluir
**Roles:** ADMIN, PROFESSOR

```json
// Erro 422: aula não está em status EM_ANDAMENTO
```

---

## Reservas `/api/reservas`

### POST /api/reservas
**Autenticado**

```json
// Request
{
  "aulaId": "clx...",
  "alunoId": "clx..."
}

// Response 201 — com vaga disponível
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "CONFIRMADA",
    "dataExpiracao": "2026-05-31T10:15:00Z"
  }
}

// Response 201 — aula lotada
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "ESPERA",
    "posicaoFila": 3
  }
}

// Erro 409: aluno já tem reserva nesta aula
// Erro 422: aluno com limite de faltas atingido (faltasReservas >= LIMITE_FALTAS_RESERVA)
// Erro 422: aula já foi concluída ou cancelada
```

---

## Graduações `/api/graduacoes`

### POST /api/graduacoes
**Roles:** ADMIN, PROFESSOR

```json
// Request
{
  "alunoId": "clx...",
  "faixaNova": "AZUL",
  "grausNovos": 0,
  "observacao": "Graduação na cerimônia de dezembro"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "clx...",
    "faixaAnterior": "BRANCA",
    "faixaNova": "AZUL",
    "grausAnteriores": 4,
    "grausNovos": 0,
    "dataPromocao": "2026-05-31T00:00:00Z"
  }
}

// Erro 422: progressão inválida (ex: tentar ir de AZUL para BRANCA)
// Erro 422: faixa de adulto para menor de 16 anos (IBJJF)
```

---

## Financeiro `/api/financeiro`

### POST /api/financeiro/matriculas
**Roles:** ADMIN, RECEPCIONISTA

```json
// Request
{
  "alunoId": "clx...",
  "academiaId": "clx...",
  "planoId": "clx...",
  "valorFinal": "299.90",            // string Decimal
  "desconto": "30.00",               // opcional
  "diaVencimento": 10,               // 1-31
  "dataInicio": "2026-06-01",
  "observacoes": "..."
}

// Response 201
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "ATIVA",
    "valorFinal": "299.90",
    "diaVencimento": 10
  }
}
```

---

### POST /api/financeiro/mensalidades/:id/pagar
**Roles:** ADMIN, RECEPCIONISTA

```json
// Request
{
  "formaPagamento": "PIX",           // DINHEIRO|PIX|CARTAO_CREDITO|CARTAO_DEBITO|TRANSFERENCIA|BOLETO
  "dataPagamento": "2026-06-08",     // opcional, default: hoje
  "observacoes": "Pago via app"
}

// Response 200
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "PAGO",
    "dataPagamento": "2026-06-08T00:00:00Z",
    "formaPagamento": "PIX"
  }
}

// Erro 422: mensalidade já está paga
```

---

## Cadastro Público `/api/public` e `/api/admin`

### POST /api/public/cadastro
**Público** — Sem autenticação

```json
// Request
{
  "nome": "Pedro Oliveira",
  "email": "pedro@email.com",
  "cpf": "987.654.321-00",
  "telefone": "11977776666",
  "dataNascimento": "1995-03-20",
  "sexo": "MASCULINO",
  "modalidades": ["JIUJITSU", "NO_GI"],
  "observacoes": "Tenho experiência em grappling"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "PENDENTE",
    "message": "Seu cadastro foi recebido e está em análise."
  }
}

// Erro 409: email ou CPF já possui cadastro pendente ou aprovado
```

---

### GET /api/public/cadastro/:id/status
**Público**

```json
// Response 200 — PENDENTE
{ "success": true, "data": { "id": "clx...", "status": "PENDENTE", "nome": "Pedro Oliveira" } }

// Response 200 — APROVADO
{ "success": true, "data": { "id": "clx...", "status": "APROVADO", "aprovadoEm": "2026-06-01T10:00:00Z" } }

// Response 200 — REJEITADO
{ "success": true, "data": { "id": "clx...", "status": "REJEITADO", "motivoRejeicao": "Vaga encerrada" } }
```

---

### PATCH /api/admin/cadastros/:id/aprovar
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

Cria automaticamente: `Pessoa`, `Aluno`, `Usuario` (perfil ALUNO).

```json
// Request: sem body

// Response 200
{
  "success": true,
  "data": {
    "cadastro": { "id": "clx...", "status": "APROVADO" },
    "aluno": { "id": "clx...", "pessoaId": "clx..." },
    "usuario": { "id": "clx...", "email": "pedro@email.com" }
  }
}
```

---

### PATCH /api/admin/cadastros/:id/rejeitar
**Roles:** ADMIN, PROFESSOR, RECEPCIONISTA

```json
// Request
{ "motivoRejeicao": "Turmas encerradas para a modalidade solicitada" }

// Response 200
{ "success": true, "data": { "id": "clx...", "status": "REJEITADO" } }
```

---

## Health Check

### GET /health
**Público**

```json
{
  "status": "ok",
  "timestamp": "2026-05-31T19:00:00.000Z",
  "uptime": 3600.42
}
```
