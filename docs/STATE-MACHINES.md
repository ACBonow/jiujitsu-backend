# State Machines — Máquinas de Estado

Diagramas de estado para todas as entidades com ciclo de vida complexo. Use estes diagramas como referência ao implementar validações de transição e ao escrever testes.

> Renderização: GitHub, VS Code + extensão "Markdown Preview Mermaid Support", ou mermaid.live

---

## 1. Aula (`StatusAula`)

```mermaid
stateDiagram-v2
    [*] --> AGENDADA : criação (manual ou via template)

    AGENDADA --> EM_ANDAMENTO : PATCH /aulas/:id/iniciar\n(professor chega e inicia)
    AGENDADA --> CANCELADA : PATCH /aulas/:id/cancelar

    EM_ANDAMENTO --> CONCLUIDA : PATCH /aulas/:id/concluir\n(aula termina)
    EM_ANDAMENTO --> CANCELADA : PATCH /aulas/:id/cancelar\n(emergência)

    CONCLUIDA --> [*]
    CANCELADA --> [*]
```

**Regras de transição:**
- Presença só pode ser registrada em aula `EM_ANDAMENTO` ou `CONCLUIDA`
- Reservas só podem ser criadas em aulas `AGENDADA`
- Cancelar uma aula `AGENDADA` deve liberar todas as reservas `CONFIRMADA` (promovendo a fila)
- Não há rollback: `CONCLUIDA` e `CANCELADA` são estados finais

---

## 2. Reserva (`StatusReserva`)

```mermaid
stateDiagram-v2
    [*] --> CONFIRMADA : aluno reserva e há vaga disponível
    [*] --> ESPERA : aluno reserva mas aula está cheia

    ESPERA --> CONFIRMADA : vaga se abre\n(cron ou cancelamento de outra reserva)\ndefine dataExpiracao = now() + 15min

    CONFIRMADA --> EXPIRADA : cron: dataExpiracao < now()\nSEM presença registrada\n→ incrementa faltasReservas do aluno\n→ promove próximo da ESPERA

    CONFIRMADA --> CANCELADA : aluno cancela\n→ promove próximo da ESPERA
    ESPERA --> CANCELADA : aluno cancela

    CONFIRMADA --> [*] : presença registrada\n(reserva consumida implicitamente)

    EXPIRADA --> [*]
    CANCELADA --> [*]

    note right of CONFIRMADA
        dataExpiracao é setada quando
        o status muda para CONFIRMADA
        (tanto na criação quanto na
        promoção da fila)
    end note
```

**Regras críticas:**
- `UNIQUE(aulaId, alunoId)` — um aluno só pode ter uma reserva por aula
- Aluno com `faltasReservas >= LIMITE_FALTAS_RESERVA` não pode criar nova reserva
- `posicaoFila` só existe para reservas em `ESPERA`; é recalculada quando alguém sai da fila
- Promoção da fila é sequencial: sempre o menor `posicaoFila` é promovido primeiro

---

## 3. Mensalidade (`StatusMensalidade`)

```mermaid
stateDiagram-v2
    [*] --> PENDENTE : cron diário 6h cria mensalidade\nquando não existe para o mês corrente

    PENDENTE --> PAGO : POST /financeiro/mensalidades/:id/pagar\n(admin ou recepcionista registra pagamento)
    PENDENTE --> ATRASADO : cron diário 9h:\ndataVencimento < today AND status = PENDENTE

    ATRASADO --> PAGO : POST /financeiro/mensalidades/:id/pagar\n(pagamento em atraso ainda aceito)

    PAGO --> [*]

    note right of ATRASADO
        Quando status muda para ATRASADO,
        o cron também verifica se o Aluno
        deve ir para INADIMPLENTE
    end note
```

**Regras:**
- `UNIQUE(matriculaId, mesReferencia)` — idempotente: cron pode rodar várias vezes sem duplicar
- Mensalidade `PAGO` é **imutável** — não pode ser revertida para `PENDENTE` ou `ATRASADO`
- Pagamento de mensalidade `ATRASADO` não muda automaticamente o status do Aluno para `ATIVO` — isso é uma ação manual separada

---

## 4. Aluno — Status (`StatusAluno`)

```mermaid
stateDiagram-v2
    [*] --> ATIVO : criação do aluno

    ATIVO --> INADIMPLENTE : cron 9h: aluno tem\npelo menos 1 mensalidade ATRASADO
    ATIVO --> INATIVO : ação manual\n(PATCH /alunos/:id/status)

    INADIMPLENTE --> ATIVO : ação manual após quitação\n(PATCH /alunos/:id/status)
    INADIMPLENTE --> INATIVO : ação manual

    INATIVO --> ATIVO : ação manual (reativação)

    note right of INADIMPLENTE
        INADIMPLENTE não bloqueia
        presença, apenas reservas
        são afetadas se configurado
    end note
```

**Regras:**
- A transição para `INADIMPLENTE` é automática (cron) mas a reversão para `ATIVO` é **sempre manual**
- Um aluno `INATIVO` não deve aparecer nas listagens padrão (filtrar por `status = ATIVO`)

---

## 5. Cadastro Pendente (`StatusCadastro`)

```mermaid
stateDiagram-v2
    [*] --> PENDENTE : POST /api/public/cadastro\n(formulário público, sem auth)

    PENDENTE --> APROVADO : PATCH /api/admin/cadastros/:id/aprovar\n→ cria Pessoa + Aluno + Usuario automaticamente
    PENDENTE --> REJEITADO : PATCH /api/admin/cadastros/:id/rejeitar\n→ salva motivoRejeicao

    APROVADO --> [*]
    REJEITADO --> [*]

    note right of APROVADO
        Aprovação é uma transação:
        1. Cria Pessoa
        2. Cria Aluno (referencia Pessoa)
        3. Cria Usuario (perfil ALUNO)
        4. Atualiza CadastroPendente.status = APROVADO
        Se qualquer passo falhar → rollback completo
    end note
```

**Regras:**
- `email` e `cpf` são únicos no `CadastroPendente` — um interessado não pode se cadastrar duas vezes
- Após aprovação, `email` e `cpf` migram para `Pessoa` — conflito com `Pessoa` existente deve ser tratado antes de aprovar
- `REJEITADO` é final — não é possível reaprovar; o interessado deve fazer novo cadastro

---

## 6. Matrícula (`StatusMatricula`)

```mermaid
stateDiagram-v2
    [*] --> ATIVA : criação da matrícula

    ATIVA --> SUSPENSA : PATCH /financeiro/matriculas/:id/status\n(ex: aluno viajou temporariamente)
    ATIVA --> CANCELADA : PATCH /financeiro/matriculas/:id/status

    SUSPENSA --> ATIVA : reativação manual
    SUSPENSA --> CANCELADA : cancelamento

    CANCELADA --> [*]

    note right of ATIVA
        Apenas matrículas ATIVAS geram
        mensalidades no cron diário
    end note
```

**Regras:**
- `SUSPENSA` para o relógio financeiro: mensalidades não são geradas enquanto suspenso
- `CANCELADA` é quase-final: para fins legais, registros históricos são mantidos
- Um aluno pode ter múltiplas matrículas ao longo do tempo (histórico)

---

## Resumo das transições automáticas (Crons)

| Cron | Horário | O que faz |
|------|---------|-----------|
| Gerar mensalidades | 6h diário | `Matricula.ATIVA` → cria `Mensalidade.PENDENTE` para o mês corrente |
| Expirar reservas | A cada 15min | `Reserva.CONFIRMADA` expirada → `EXPIRADA`; promove próximo `ESPERA` → `CONFIRMADA` |
| Verificar inadimplência | 9h diário | `Mensalidade.PENDENTE` vencida → `ATRASADO`; `Aluno` com `ATRASADO` → `INADIMPLENTE` |
