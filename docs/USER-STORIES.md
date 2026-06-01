# User Stories — Sistema de Gestão de Academias de Jiu-Jitsu

Histórias de usuário organizadas por perfil e domínio. Cada história define **quem**, **o quê** e **por quê**, seguido dos critérios de aceitação (Given/When/Then).

Estas histórias são a fonte de verdade do comportamento esperado do sistema — use-as ao escrever testes e ao validar implementações.

---

## Legenda de prioridade

| Label | Significado |
|-------|-------------|
| 🔴 MUST | Essencial — sistema não funciona sem isso |
| 🟡 SHOULD | Importante — forte impacto no usuário |
| 🟢 COULD | Desejável — melhora a experiência |

---

## Autenticação

### US-001 — Login 🔴 MUST
**Como** qualquer usuário do sistema  
**Quero** fazer login com email e senha  
**Para que** eu possa acessar as funcionalidades do meu perfil

**Critérios de aceitação:**
- **Given** estou na página de login  
  **When** insiro email e senha corretos  
  **Then** sou redirecionado para o dashboard e vejo meu nome no header

- **Given** insiro senha incorreta  
  **Then** vejo mensagem "Credenciais inválidas" e permaneço na tela de login

- **Given** fico sem usar o sistema por 15 minutos  
  **When** faço qualquer ação  
  **Then** o token é renovado automaticamente sem que eu perceba (sem logout involuntário)

- **Given** o refresh token expirou (após 7 dias sem uso)  
  **When** tento usar o sistema  
  **Then** sou redirecionado para o login

---

### US-002 — Logout 🔴 MUST
**Como** qualquer usuário autenticado  
**Quero** encerrar minha sessão  
**Para que** outros não acessem minha conta no mesmo dispositivo

**Critérios de aceitação:**
- **When** clico em "Sair"  
  **Then** sou redirecionado para o login e meu token é invalidado no servidor

---

## Gestão de Academias (ADMIN)

### US-010 — Criar academia 🔴 MUST
**Como** ADMIN  
**Quero** cadastrar uma nova unidade/academia  
**Para que** eu possa organizar alunos, professores e aulas por unidade

**Critérios de aceitação:**
- **Given** preencho nome (obrigatório) e demais dados  
  **When** salvo  
  **Then** a academia aparece na lista com status "Ativo"

- **Given** insiro um CNPJ que já existe  
  **Then** vejo erro "CNPJ já cadastrado"

---

### US-011 — Desativar academia 🟡 SHOULD
**Como** ADMIN  
**Quero** desativar uma academia  
**Para que** ela não apareça mais nas operações do dia a dia (sem perder histórico)

**Critérios de aceitação:**
- **Given** confirmo a desativação  
  **Then** a academia some das listagens padrão mas permanece no histórico de alunos/aulas

---

## Gestão de Alunos

### US-020 — Cadastrar aluno 🔴 MUST
**Como** ADMIN, PROFESSOR ou RECEPCIONISTA  
**Quero** cadastrar um novo aluno  
**Para que** ele apareça nas listas de presença e possa ser matriculado

**Critérios de aceitação:**
- **Given** preencho nome, email e data de nascimento (adulto)  
  **When** salvo  
  **Then** o aluno é criado com faixa BRANCA, 0 graus e status ATIVO

- **Given** a data de nascimento indica menor de 18 anos  
  **When** não preencho nome do responsável  
  **Then** vejo erro de validação antes de submeter

- **Given** insiro CPF de um aluno já existente  
  **Then** vejo erro "CPF já cadastrado"

---

### US-021 — Visualizar perfil do aluno 🔴 MUST
**Como** ADMIN, PROFESSOR ou RECEPCIONISTA  
**Quero** ver o perfil completo de um aluno  
**Para que** eu possa acompanhar sua evolução e situação financeira

**Critérios de aceitação:**
- **Given** acesso o perfil de um aluno  
  **Then** vejo: dados pessoais, faixa atual com graus, status, histórico de presenças e histórico de graduações

---

### US-022 — Inativar aluno 🟡 SHOULD
**Como** ADMIN ou RECEPCIONISTA  
**Quero** inativar um aluno que parou de treinar  
**Para que** ele não apareça nas listagens ativas mas o histórico seja preservado

**Critérios de aceitação:**
- **When** mudo o status para INATIVO  
  **Then** o aluno some da lista padrão (filtro status=ATIVO)  
  **And** suas presenças e graduações anteriores são mantidas

---

### US-023 — Buscar aluno por nome 🟡 SHOULD
**Como** qualquer usuário interno  
**Quero** buscar alunos por nome  
**Para que** eu encontre rapidamente um aluno específico na lista

**Critérios de aceitação:**
- **Given** digito parte do nome no campo de busca  
  **Then** a lista é filtrada em tempo real (debounced) mostrando apenas alunos que contêm o texto buscado

---

## Gestão de Professores

### US-030 — Cadastrar professor 🔴 MUST
**Como** ADMIN  
**Quero** cadastrar um professor com suas modalidades  
**Para que** ele possa ser vinculado a aulas e academias

**Critérios de aceitação:**
- **Given** seleciono pelo menos uma modalidade  
  **When** salvo  
  **Then** o professor aparece disponível para associação com academias

- **Given** não seleciono nenhuma modalidade  
  **Then** vejo validação "Selecione ao menos uma modalidade"

---

### US-031 — Vincular professor a academia 🔴 MUST
**Como** ADMIN  
**Quero** vincular/desvincular professores a academias específicas  
**Para que** cada academia tenha sua equipe de professores

**Critérios de aceitação:**
- **Given** vinculo um professor a uma academia  
  **Then** ele aparece nas listagens de professor desta academia  
  **And** pode ser selecionado como professor de aulas dessa academia

---

## Aulas e Grade Semanal

### US-040 — Criar template de aula 🔴 MUST
**Como** ADMIN ou PROFESSOR  
**Quero** definir a grade semanal de aulas  
**Para que** as aulas sejam geradas automaticamente para qualquer período

**Critérios de aceitação:**
- **Given** defino: dia da semana, horário, professor, categoria e limite de alunos  
  **When** salvo  
  **Then** o template aparece na grade semanal

---

### US-041 — Gerar aulas de um período 🔴 MUST
**Como** ADMIN ou PROFESSOR  
**Quero** gerar todas as aulas de um mês a partir dos templates  
**Para que** eu não precise criar cada aula manualmente

**Critérios de aceitação:**
- **Given** seleciono academia, data início e data fim  
  **When** gero as aulas  
  **Then** são criadas aulas para cada dia do período que coincide com os templates ativos  
  **And** aulas que já existiam no período não são duplicadas

- **Given** um período já tem aulas geradas  
  **When** gero novamente  
  **Then** apenas as aulas faltantes são criadas (operação idempotente)

---

### US-042 — Iniciar e concluir aula 🔴 MUST
**Como** PROFESSOR  
**Quero** marcar uma aula como em andamento e depois como concluída  
**Para que** eu possa registrar presenças e manter o histórico correto

**Critérios de aceitação:**
- **Given** uma aula está AGENDADA  
  **When** clico "Iniciar"  
  **Then** o status muda para EM_ANDAMENTO e o botão de presença é habilitado

- **Given** a aula está EM_ANDAMENTO  
  **When** clico "Concluir"  
  **Then** o status muda para CONCLUIDA

- **Given** tentou-se iniciar uma aula já CONCLUIDA  
  **Then** vejo erro

---

### US-043 — Cancelar aula 🟡 SHOULD
**Como** ADMIN ou PROFESSOR  
**Quero** cancelar uma aula  
**Para que** os alunos com reserva sejam notificados (via lista) e as vagas liberadas

**Critérios de aceitação:**
- **Given** cancelo uma aula com reservas CONFIRMADAS  
  **Then** todas as reservas passam para CANCELADA  
  **And** a vaga volta a estar disponível (sem efeito — aula cancelada não tem vagas)

---

### US-044 — Substituir professor 🟡 SHOULD
**Como** ADMIN  
**Quero** definir um professor substituto para uma aula  
**Para que** a aula aconteça mesmo quando o professor titular está ausente

**Critérios de aceitação:**
- **Given** seleciono um professor substituto (diferente do titular)  
  **When** salvo  
  **Then** o substituto aparece destacado no detalhe da aula

---

## Presenças

### US-050 — Registrar presença em lote 🔴 MUST
**Como** PROFESSOR ou RECEPCIONISTA  
**Quero** marcar presença de múltiplos alunos de uma vez  
**Para que** o processo de chamada seja rápido

**Critérios de aceitação:**
- **Given** a aula está EM_ANDAMENTO  
  **When** seleciono os alunos presentes e salvo  
  **Then** as presenças são registradas e `aulasDesdePromocao` de cada aluno é incrementado

- **Given** a aula está apenas AGENDADA  
  **Then** o botão de registrar presença está desabilitado com tooltip explicativo

- **Given** um aluno já tem presença registrada nesta aula  
  **When** salvo novamente com ele marcado  
  **Then** não é criada duplicata (operação idempotente)

---

## Reservas

### US-060 — Reservar vaga em aula 🔴 MUST
**Como** ALUNO  
**Quero** reservar uma vaga em uma aula  
**Para que** minha participação seja garantida quando há limite de alunos

**Critérios de aceitação:**
- **Given** há vagas disponíveis  
  **When** faço a reserva  
  **Then** recebo confirmação com o horário de expiração (agora + 15min)

- **Given** a aula está lotada  
  **When** faço a reserva  
  **Then** entro na fila de espera e vejo minha posição

- **Given** tenho 3 ou mais faltas em reservas  
  **Then** vejo mensagem "Você atingiu o limite de faltas" e não posso reservar

---

### US-061 — Fila de espera promovida automaticamente 🔴 MUST
**Como** ALUNO na fila de espera  
**Quero** ser promovido automaticamente quando uma vaga se abre  
**Para que** eu não perca a oportunidade de comparecer

**Critérios de aceitação:**
- **Given** estou em 1º lugar na fila de espera  
  **When** o aluno com reserva CONFIRMADA cancela ou sua reserva expira  
  **Then** minha reserva muda para CONFIRMADA com 15 minutos para comparecer

---

### US-062 — Cancelar reserva 🟡 SHOULD
**Como** ALUNO  
**Quero** cancelar minha reserva  
**Para que** outra pessoa possa usar minha vaga

**Critérios de aceitação:**
- **Given** tenho uma reserva CONFIRMADA  
  **When** cancelo  
  **Then** minha reserva vai para CANCELADA e o próximo da fila é promovido

---

## Graduações

### US-070 — Registrar promoção de faixa 🔴 MUST
**Como** PROFESSOR  
**Quero** registrar a promoção de um aluno para nova faixa  
**Para que** o histórico de graduações fique documentado

**Critérios de aceitação:**
- **Given** seleciono o aluno e a nova faixa/graus  
  **When** confirmo  
  **Then** o histórico de graduação é criado (imutável) e a faixa do aluno é atualizada  
  **And** `aulasDesdePromocao` do aluno é zerado

- **Given** seleciono uma faixa de adulto para um aluno menor de 15 anos  
  **Then** vejo aviso sobre progressão IBJJF

---

### US-071 — Visualizar histórico de graduações 🟡 SHOULD
**Como** qualquer usuário interno  
**Quero** ver o histórico de faixas de um aluno  
**Para que** eu entenda sua trajetória na academia

**Critérios de aceitação:**
- **Given** acesso a aba "Graduações" do perfil do aluno  
  **Then** vejo uma timeline com: data, faixa anterior, faixa nova, observação

---

## Financeiro

### US-080 — Criar plano 🔴 MUST
**Como** ADMIN  
**Quero** criar planos com preços e modalidades inclusas  
**Para que** as matrículas tenham um produto de referência

**Critérios de aceitação:**
- **Given** defino nome, valor base e modalidades  
  **When** salvo  
  **Then** o plano fica disponível para novas matrículas

---

### US-081 — Matricular aluno 🔴 MUST
**Como** ADMIN ou RECEPCIONISTA  
**Quero** criar uma matrícula vinculando aluno a academia e plano  
**Para que** as mensalidades sejam geradas automaticamente

**Critérios de aceitação:**
- **Given** seleciono aluno, academia, plano, valor final e dia de vencimento  
  **When** salvo  
  **Then** a matrícula é criada com status ATIVA  
  **And** na próxima execução do cron, a mensalidade do mês corrente é gerada

---

### US-082 — Registrar pagamento de mensalidade 🔴 MUST
**Como** RECEPCIONISTA  
**Quero** registrar o pagamento de uma mensalidade  
**Para que** o status financeiro do aluno seja atualizado

**Critérios de aceitação:**
- **Given** seleciono a forma de pagamento  
  **When** confirmo  
  **Then** a mensalidade muda para PAGO e o aluno deixa de figurar como inadimplente (se não tiver outras mensalidades ATRASADO)

- **Given** a mensalidade já está PAGO  
  **Then** o botão de registrar pagamento está desabilitado

---

### US-083 — Ver mensalidades atrasadas 🟡 SHOULD
**Como** RECEPCIONISTA  
**Quero** ver todas as mensalidades atrasadas  
**Para que** eu possa entrar em contato com os alunos inadimplentes

**Critérios de aceitação:**
- **Given** filtro por status=ATRASADO  
  **Then** vejo lista com aluno, valor, data de vencimento e dias em atraso

---

## Pré-cadastro Público

### US-090 — Enviar pré-cadastro 🔴 MUST
**Como** pessoa interessada em se matricular  
**Quero** enviar meu interesse de matrícula pelo site  
**Para que** a academia entre em contato sem eu precisar ir pessoalmente

**Critérios de aceitação:**
- **Given** preencho nome, CPF, email e modalidades de interesse  
  **When** envio  
  **Then** recebo um ID de acompanhamento e mensagem "Cadastro recebido"

- **Given** já enviei um cadastro anteriormente  
  **When** tento enviar com o mesmo email ou CPF  
  **Then** vejo mensagem "Você já possui um cadastro"

---

### US-091 — Verificar status do pré-cadastro 🟡 SHOULD
**Como** pessoa que enviou pré-cadastro  
**Quero** verificar o status do meu pedido  
**Para que** eu saiba se fui aprovado, rejeitado ou ainda estou aguardando

**Critérios de aceitação:**
- **Given** insiro meu ID ou email  
  **Then** vejo o status atual (PENDENTE / APROVADO / REJEITADO)  
  **And** se REJEITADO, vejo o motivo informado pela academia

---

### US-092 — Aprovar pré-cadastro 🔴 MUST
**Como** ADMIN, PROFESSOR ou RECEPCIONISTA  
**Quero** aprovar um pré-cadastro  
**Para que** o interessado receba acesso ao sistema como aluno

**Critérios de aceitação:**
- **Given** aprovo o cadastro  
  **Then** são criados automaticamente: Pessoa, Aluno (faixa BRANCA) e Usuario (perfil ALUNO)  
  **And** se qualquer passo falhar, nada é criado (transação atômica)

---

### US-093 — Rejeitar pré-cadastro 🟡 SHOULD
**Como** ADMIN, PROFESSOR ou RECEPCIONISTA  
**Quero** rejeitar um pré-cadastro com um motivo  
**Para que** o interessado entenda por que não foi aceito

**Critérios de aceitação:**
- **Given** preencho o motivo de rejeição  
  **When** confirmo  
  **Then** o status muda para REJEITADO e o motivo fica visível para o interessado

- **Given** não preencho o motivo  
  **Then** vejo validação "Motivo de rejeição é obrigatório"

---

## Mapeamento Stories → Rotas da API

| User Story | Método | Rota |
|------------|--------|------|
| US-001 | POST | /api/auth/login |
| US-002 | POST | /api/auth/logout |
| US-010 | POST | /api/academias |
| US-020 | POST | /api/alunos |
| US-021 | GET | /api/alunos/:id |
| US-022 | PATCH | /api/alunos/:id/status |
| US-040 | POST | /api/aulas/templates |
| US-041 | POST | /api/aulas/gerar |
| US-042 | PATCH | /api/aulas/:id/iniciar, /concluir |
| US-050 | POST | /api/presencas |
| US-060 | POST | /api/reservas |
| US-062 | PATCH | /api/reservas/:id/cancelar |
| US-070 | POST | /api/graduacoes |
| US-081 | POST | /api/financeiro/matriculas |
| US-082 | POST | /api/financeiro/mensalidades/:id/pagar |
| US-090 | POST | /api/public/cadastro |
| US-091 | GET | /api/public/cadastro/:id/status |
| US-092 | PATCH | /api/admin/cadastros/:id/aprovar |
| US-093 | PATCH | /api/admin/cadastros/:id/rejeitar |
