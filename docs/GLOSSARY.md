# Glossário de Domínio — Sistema de Gestão de Academias de Artes Marciais

Este glossário define os termos do negócio usados no código, documentação e comunicação da equipe. IAs que geram código para este projeto **devem** usar estes termos exatamente como definidos.

---

## Entidades Principais

### Academia
Uma unidade física de ensino de artes marciais. O sistema suporta múltiplas academias independentes na mesma instância. Uma academia tem professores, alunos, aulas e matrículas associadas.

> **No código:** modelo `Academia` no Prisma; campo `academiaId` em quase todas as entidades para isolamento de dados.

### Pessoa
Entidade base que contém dados pessoais (nome, CPF, email, endereço). Toda identidade humana no sistema é uma `Pessoa`. Um `Aluno` e um `Professor` são especializações de `Pessoa` — a mesma pessoa pode ser ambos.

> **No código:** modelo `Pessoa`; relação `1:1` com `Usuario`, `Aluno`, e/ou `Professor`.

### Usuário (Usuario)
Representa a conta de acesso ao sistema. Tem email, senha (hash bcrypt) e perfil de acesso. Sempre vinculado a uma `Pessoa`. Pode ou não estar vinculado a uma academia específica (Admin global tem `academiaId = null`).

> **Não confundir:** `Pessoa` ≠ `Usuario`. Uma pessoa pode existir sem conta de acesso (ex: responsável de menor). Um usuário sempre tem uma pessoa.

### Aluno
Especialização de `Pessoa` com dados específicos de praticante: faixa, graus, categorias IBJJF (idade, peso), status de inadimplência e histórico de presenças/graduações. Cada aluno pode ter um professor responsável.

### Professor
Especialização de `Pessoa` que leciona modalidades específicas. Pode lecionar em múltiplas academias (relação N:N). Pode ser também `Aluno` (para controle de sua própria graduação).

---

## Graduação (Belt Progression)

### Faixa
Nível de habilidade no Jiu-Jitsu, conforme o sistema IBJJF. Há faixas de Kids (4-15 anos) e faixas de Adulto (16+).

| Grupo | Faixas |
|-------|--------|
| Kids | BRANCA → CINZA → AMARELA → LARANJA → VERDE |
| Adulto | BRANCA → AZUL → ROXA → MARROM → PRETA |
| Coral/Vermelha | CORAL_PRETA_VERMELHA (7°) → CORAL_BRANCA_VERMELHA (8°) → VERMELHA (9°/10°) |

### Graus
Subdivisões dentro de uma faixa (0 a 4 para a maioria; faixa preta pode ter até 6). São representados por barras ou listras na faixa física.

### Promoção (Graduação)
Evento formal que eleva o `Aluno` de uma faixa/grau para outro. Cria um registro imutável em `Graduacao` (histórico append-only). Atualiza `faixa`, `graus`, `dataUltimaPromocao` e zera `aulasDesdePromocao` no Aluno.

> **Regra IBJJF:** Adultos não recebem faixas Kids. Kids não pulam faixas. Cada promoção deve respeitar a progressão natural.

### aulasDesdePromocao
Contador de presenças desde a última promoção. Incrementado a cada presença registrada. Resetado a zero em cada promoção. Serve como critério auxiliar para decidir quando promover um aluno.

---

## Aulas e Presenças

### Template de Aula (TemplateAula)
Modelo recorrente de aula que define: dia da semana, horário, duração, categoria de turma, professor padrão e limite de alunos. Templates são a "grade semanal" — não são aulas em si, mas a receita para gerar aulas.

> **Analogia:** O template é o "molde". A aula é o "produto" gerado pelo molde.

### Aula
Instância concreta de uma aula em uma data/hora específica. Pode ser gerada a partir de um template (via endpoint `POST /api/aulas/gerar`) ou criada manualmente (aula extra ou particular). Tem um ciclo de vida de status:
```
AGENDADA → EM_ANDAMENTO → CONCLUIDA
          → CANCELADA
```

### Categoria de Turma (CategoriaTurma)
Classifica o público da aula. Define quem pode se inscrever/comparecer:
- `ADULTO_MISTO` — todos os adultos
- `KIDS` — crianças
- `COMPETICAO` — equipe de competição
- `NOGI` — sem kimono
- `ADULTO_INICIANTE` — turma específica para iniciantes

### Presença
Registro confirmado de que um `Aluno` compareceu a uma `Aula`. É única por `(aulaId, alunoId)`. Só pode ser registrada em aulas `EM_ANDAMENTO` ou `CONCLUIDA`.

---

## Reservas

### Reserva
Manifestação de intenção de um `Aluno` de comparecer a uma `Aula`. É diferente de `Presença` — a reserva é feita antes da aula; a presença é registrada durante ou depois.

### Fila de Espera
Quando uma aula atinge seu `limiteAlunos`, novas reservas entram com status `ESPERA` e uma posição de fila (`posicaoFila`). O próximo da fila é promovido automaticamente quando uma vaga se abre.

### Expiração de Reserva
Reserva `CONFIRMADA` que não foi "consumida" (não gerou presença) expira após `CONFIRMACAO_RESERVA_MINUTOS` (default: 15 min). O aluno perde a vaga e o próximo da fila é promovido. O aluno inadimplente em reservas (status `FALTOU`) acumula `faltasReservas`.

### Falta em Reserva
Quando o cron detecta que uma reserva `CONFIRMADA` expirou sem check-in, o status muda para `FALTOU` e `faltasReservas` do aluno é incrementado. Aluno com `faltasReservas >= LIMITE_FALTAS_RESERVA` (default: 3) está bloqueado de fazer novas reservas.

---

## Financeiro

### Plano
Produto financeiro que define o que o aluno tem acesso (modalidades) e o preço base. Pode ter preço diferenciado por academia via `PlanoAcademia`.

### Matrícula
Contrato vigente entre um `Aluno` e uma `Academia` para um `Plano` específico. Define o valor final (após possível desconto), o dia de vencimento mensal e a vigência. Uma matrícula ativa gera mensalidades automaticamente.

> **Distinção:** `Plano` é o produto genérico; `Matrícula` é o contrato específico do aluno.

### Mensalidade
Cobrança mensal gerada automaticamente para cada `Matrícula` ativa. Identificada por `mesReferencia` no formato `"YYYY-MM"` (ex: `"2026-05"`). Ciclo de vida:
```
PENDENTE → PAGO (quando pagamento é registrado)
PENDENTE → ATRASADO (quando dataVencimento passa sem pagamento — via cron)
```

### Dia de Vencimento (diaVencimento)
Campo na `Matrícula` que define o dia do mês em que as mensalidades vencem (1-31). A `dataVencimento` da mensalidade de cada mês é calculada combinando este dia com o mês de referência.

### Regra de Pagamento (RegraPagamentoAcademia)
Configuração de desconto que cada `Academia` define de forma independente para suas mensalidades: desconto por antecipação (x% se pago até o dia y do mês) e desconto por forma de pagamento (z% para formas sem taxa, como DINHEIRO/PIX — configurável). `descontosAcumulativos` decide se os dois se somam ou se aplica-se apenas o maior.

### Pagamento em Lote (PagamentoLote)
Registro de uma operação de pagamento que agrupa uma ou mais `Mensalidade`. Cobre tanto o pagamento de uma única mensalidade (lote de 1 item) quanto o **pagamento combinado** (ex: mensalidade do pai + do filho pagas juntas, numa única operação em dinheiro ou PIX). Não existe vínculo formal de família no sistema — o operador simplesmente seleciona as mensalidades pendentes que deseja quitar juntas.

---

## Pré-cadastro

### Cadastro Pendente (CadastroPendente)
Solicitação de interesse enviada por um futuro aluno via formulário público (sem autenticação). Aguarda aprovação de ADMIN/PROFESSOR/RECEPCIONISTA. Quando aprovado, gera automaticamente: `Pessoa`, `Aluno` e `Usuario`.

### Status do Cadastro
- `PENDENTE` — aguardando análise
- `APROVADO` — conta criada, aluno pode fazer login
- `REJEITADO` — negado com `motivoRejeicao`

---

## Perfis de Acesso

| Perfil | Escopo | Restrições |
|--------|--------|------------|
| `ADMIN` | Global (todas as academias) | Nenhuma |
| `PROFESSOR` | Academia vinculada | Não acessa financeiro |
| `RECEPCIONISTA` | Academia vinculada | Não cria/edita professores |
| `ALUNO` | Apenas seus próprios dados | Apenas visualização |

> **Regra importante:** Usuários com `academiaId != null` (Professor, Recepcionista, Aluno) só veem dados da sua academia. ADMIN (`academiaId = null`) vê tudo.

---

## Categorias IBJJF

### Categoria de Idade
Definida pela data de nascimento do aluno, conforme tabela IBJJF:

| Categoria | Faixa de Idade |
|-----------|---------------|
| PRE_MIRIM | 4-5 anos |
| MIRIM | 6-7 anos |
| INFANTIL | 8-9 anos |
| INFANTO_JUVENIL | 10-11 anos |
| JUVENIL | 12-13 anos |
| TEEN | 14-15 anos |
| ADULTO | 18-29 anos |
| MASTER_1 | 30-35 anos |
| MASTER_2 | 36-40 anos |
| MASTER_3 | 41-45 anos |
| MASTER_4 | 46-50 anos |
| MASTER_5 | 51-55 anos |
| MASTER_6 | 56-60 anos |
| MASTER_7 | 61+ anos |

### Categoria de Peso
Divisão por peso corporal (em kg) usada em competições. Os valores exatos variam por sexo e categoria de idade — a tabela completa está no site oficial da IBJJF.

---

## Jobs Automáticos (Crons)

### Geração de Mensalidades
Cron diário (6h) que percorre todas as `Matricula` com status `ATIVA` e cria a `Mensalidade` do mês corrente se ainda não existir. Usa `UNIQUE(matriculaId, mesReferencia)` para idempotência.

### Expiração de Reservas
Cron a cada 15 minutos que busca `Reserva` com status `CONFIRMADA` e `dataExpiracao < now()`. Muda status para `EXPIRADA`, incrementa `faltasReservas` do aluno, e promove o próximo da fila de `ESPERA` para `CONFIRMADA`.

### Verificação de Inadimplência
Cron diário (9h) que:
1. Busca `Mensalidade` `PENDENTE` com `dataVencimento < now()` → muda para `ATRASADO`
2. Busca `Aluno` com pelo menos uma mensalidade `ATRASADO` → muda `status` para `INADIMPLENTE`
