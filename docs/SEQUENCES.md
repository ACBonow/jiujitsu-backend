# Sequence Diagrams — Fluxos Críticos do Sistema

Diagramas de sequência para os fluxos mais complexos do sistema. Use como referência ao implementar, testar ou depurar estes fluxos.

> Renderização: GitHub, VS Code + extensão "Markdown Preview Mermaid Support", ou mermaid.live

---

## 1. Autenticação — Login + Refresh automático de token

```mermaid
sequenceDiagram
    actor U as Usuário
    participant FE as Frontend (Next.js)
    participant S as Auth Store (Zustand)
    participant API as Backend API
    participant DB as PostgreSQL

    U->>FE: POST /login (email, senha)
    FE->>API: POST /api/auth/login
    API->>DB: SELECT Usuario WHERE email = ?
    DB-->>API: usuario (com senha hash)
    API->>API: bcrypt.compare(senha, hash)
    alt senha correta
        API->>API: generateAccessToken (15min)
        API->>API: generateRefreshToken (7d)
        API->>DB: UPDATE usuario SET refreshToken = hash(newRefreshToken)
        DB-->>API: ok
        API-->>FE: { accessToken, refreshToken, user }
        FE->>S: setAuth({ accessToken, refreshToken, user })
        S->>S: persist to localStorage
        FE-->>U: redirect /dashboard
    else senha incorreta
        API-->>FE: 401 Credenciais inválidas
        FE-->>U: toast.error(...)
    end

    Note over FE,API: --- Mais tarde, accessToken expira (15min) ---

    FE->>API: GET /api/alunos (com accessToken expirado)
    API-->>FE: 401 Token expirado

    FE->>FE: interceptor detecta 401
    FE->>FE: pausa fila de requisições pendentes

    FE->>API: POST /api/auth/refresh { refreshToken }
    API->>API: verifyRefreshToken(token)
    API->>DB: SELECT usuario WHERE refreshToken = hash(token)
    DB-->>API: usuario
    alt refresh token válido
        API->>API: generateAccessToken (novo 15min)
        API->>API: generateRefreshToken (novo 7d)
        API->>DB: UPDATE refreshToken (rotação)
        API-->>FE: { accessToken, refreshToken }
        FE->>S: atualiza tokens no store
        FE->>FE: retenta fila de requisições pausadas
        FE->>API: GET /api/alunos (novo accessToken)
        API-->>FE: 200 { data: [...] }
    else refresh token inválido/expirado
        API-->>FE: 401
        FE->>S: logout()
        FE-->>U: redirect /login
    end
```

---

## 2. Reserva de Aula — Criação + Fila de Espera + Promoção

```mermaid
sequenceDiagram
    actor A as Aluno
    participant FE as Frontend
    participant API as Backend
    participant DB as PostgreSQL
    participant CRON as Cron (a cada 15min)

    A->>FE: clica "Reservar" na aula
    FE->>API: POST /api/reservas { aulaId, alunoId }
    
    API->>DB: SELECT Aluno WHERE id = alunoId
    DB-->>API: aluno (com faltasReservas)
    
    alt faltasReservas >= LIMITE_FALTAS_RESERVA
        API-->>FE: 422 Limite de faltas atingido
        FE-->>A: toast.error(...)
    else aluno apto
        API->>DB: SELECT COUNT(*) FROM Reserva WHERE aulaId AND status = CONFIRMADA
        DB-->>API: count (ex: 18)
        API->>DB: SELECT Aula.limiteAlunos WHERE id = aulaId
        DB-->>API: limiteAlunos (ex: 20)
        
        alt há vagas (count < limiteAlunos ou limiteAlunos = null)
            API->>DB: INSERT Reserva { status: CONFIRMADA, dataExpiracao: now()+15min }
            DB-->>API: reserva criada
            API-->>FE: 201 { status: CONFIRMADA, dataExpiracao: ... }
            FE-->>A: "Reserva confirmada! Válida até HH:MM"
        else aula lotada
            API->>DB: SELECT MAX(posicaoFila) FROM Reserva WHERE aulaId AND status = ESPERA
            DB-->>API: maxPosicao (ex: 3)
            API->>DB: INSERT Reserva { status: ESPERA, posicaoFila: 4 }
            DB-->>API: reserva criada
            API-->>FE: 201 { status: ESPERA, posicaoFila: 4 }
            FE-->>A: "Você está na fila de espera (posição 4)"
        end
    end

    Note over CRON,DB: --- Cron roda a cada 15 minutos ---

    CRON->>DB: SELECT Reserva WHERE status=CONFIRMADA AND dataExpiracao < now()
    DB-->>CRON: [reservaExpirada1, ...]
    
    loop para cada reserva expirada
        CRON->>DB: UPDATE Reserva SET status = EXPIRADA
        CRON->>DB: UPDATE Aluno SET faltasReservas = faltasReservas + 1
        
        CRON->>DB: SELECT Reserva WHERE aulaId AND status=ESPERA ORDER BY posicaoFila ASC LIMIT 1
        DB-->>CRON: proximoDaFila (ou null)
        
        alt há próximo na fila
            CRON->>DB: UPDATE Reserva SET status=CONFIRMADA, dataExpiracao=now()+15min
            Note right of DB: Próximo aluno agora tem 15min para comparecer
        end
    end
```

---

## 3. Aprovação de Pré-cadastro Público

```mermaid
sequenceDiagram
    actor I as Interessado (público)
    actor R as Recepcionista
    participant FE as Frontend
    participant API as Backend
    participant DB as PostgreSQL

    Note over I,API: --- Etapa 1: Pré-cadastro público ---

    I->>FE: acessa /cadastro (sem login)
    I->>FE: preenche formulário (nome, CPF, email, modalidades...)
    FE->>API: POST /api/public/cadastro
    
    API->>DB: CHECK email e CPF não existem em CadastroPendente nem Pessoa
    
    alt email/CPF já existe
        API-->>FE: 409 Email ou CPF já cadastrado
        FE-->>I: mensagem de erro
    else dados únicos
        API->>DB: INSERT CadastroPendente { status: PENDENTE }
        DB-->>API: cadastro { id: "clx..." }
        API-->>FE: 201 { id: "clx...", status: PENDENTE }
        FE-->>I: "Cadastro enviado! Guarde seu ID: clx..."
    end

    Note over I,API: --- Interessado acompanha status ---

    I->>FE: acessa /cadastro/verificar
    I->>FE: digita seu ID
    FE->>API: GET /api/public/cadastro/:id/status
    API->>DB: SELECT CadastroPendente WHERE id
    DB-->>API: cadastro (status PENDENTE)
    API-->>FE: { status: PENDENTE }
    FE-->>I: "Seu cadastro está em análise"

    Note over R,DB: --- Etapa 2: Aprovação pelo admin/recepcionista ---

    R->>FE: acessa /cadastros (painel interno)
    FE->>API: GET /api/admin/cadastros?status=PENDENTE
    API-->>FE: lista de cadastros pendentes
    FE-->>R: tabela com cadastros

    R->>FE: clica "Aprovar" no cadastro do Interessado
    FE->>FE: confirm dialog "Confirmar aprovação?"
    R->>FE: confirma

    FE->>API: PATCH /api/admin/cadastros/:id/aprovar
    
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT Pessoa { nome, email, cpf, ... }
    API->>DB: INSERT Aluno { pessoaId, faixa: BRANCA, status: ATIVO }
    API->>DB: INSERT Usuario { email, perfil: ALUNO, senha: temporária }
    API->>DB: UPDATE CadastroPendente SET status=APROVADO, aprovadoPorId, aprovadoEm
    API->>DB: COMMIT
    
    DB-->>API: { cadastro, aluno, usuario }
    API-->>FE: 200 { cadastro, aluno, usuario }
    FE-->>R: toast.success("Cadastro aprovado! Aluno e usuário criados.")

    Note over I,API: --- Interessado verifica novamente ---
    I->>API: GET /api/public/cadastro/:id/status
    API-->>I: { status: APROVADO, aprovadoEm: "..." }
```

---

## 4. Geração Automática de Mensalidades (Cron diário 6h)

```mermaid
sequenceDiagram
    participant CRON as Cron (6h diário)
    participant API as Backend Function
    participant DB as PostgreSQL

    CRON->>API: GET /api/cron/atualizar-mensalidades\n(Authorization: Bearer CRON_SECRET)
    
    API->>API: verifica header Authorization
    alt CRON_SECRET inválido
        API-->>CRON: 401 (ignora)
    end

    API->>API: calcula mesReferencia = "YYYY-MM" do mês atual

    API->>DB: SELECT Matricula WHERE status = ATIVA
    DB-->>API: [matricula1, matricula2, ...]

    loop para cada matrícula ativa
        API->>DB: SELECT Mensalidade WHERE matriculaId AND mesReferencia
        DB-->>API: mensalidade existente (ou null)
        
        alt mensalidade já existe (idempotente)
            API->>API: pula (nada a fazer)
        else mensalidade não existe
            API->>API: calcula dataVencimento:\n  dia = matricula.diaVencimento\n  mês = mesReferencia
            API->>DB: INSERT Mensalidade {\n  matriculaId,\n  mesReferencia,\n  valor: matricula.valorFinal,\n  dataVencimento,\n  status: PENDENTE\n}
            DB-->>API: mensalidade criada
        end
    end

    API-->>CRON: 200 { criadas: N, ignoradas: M }

    Note over CRON,DB: --- Cron de verificação roda às 9h ---

    CRON->>API: GET /api/cron/verificar-inadimplencia
    API->>DB: SELECT Mensalidade WHERE status=PENDENTE AND dataVencimento < today
    DB-->>API: [mensalidadeVencida1, ...]
    
    loop para cada mensalidade vencida
        API->>DB: UPDATE Mensalidade SET status = ATRASADO
    end

    API->>DB: SELECT DISTINCT alunoId FROM Matricula\n  JOIN Mensalidade ON matriculaId\n  WHERE status = ATRASADO
    DB-->>API: [alunoId1, alunoId2, ...]
    
    API->>DB: UPDATE Aluno SET status = INADIMPLENTE\n  WHERE id IN [...]
    
    API-->>CRON: 200 { atualizadas: N, inadimplentes: M }
```

---

## 5. Registrar Presença em Aula

```mermaid
sequenceDiagram
    actor P as Professor
    participant FE as Frontend
    participant API as Backend
    participant DB as PostgreSQL

    P->>FE: acessa /presencas
    P->>FE: seleciona a aula do dia
    
    FE->>API: GET /api/aulas/:id
    API->>DB: SELECT Aula WHERE id
    DB-->>API: aula (status: EM_ANDAMENTO)
    API-->>FE: dados da aula

    FE->>API: GET /api/presencas/aula/:aulaId
    DB-->>API: presenças já registradas
    API-->>FE: lista de presenças existentes

    FE-->>P: lista de alunos com checkboxes\n(pré-marcados quem já tem presença)

    P->>FE: marca checkboxes dos alunos presentes
    P->>FE: clica "Salvar Presenças"

    FE->>API: POST /api/presencas\n{ aulaId, alunoIds: ["id1", "id2", ...] }

    API->>DB: SELECT Aula.status WHERE id = aulaId
    DB-->>API: status = EM_ANDAMENTO
    
    alt status não permite presença (AGENDADA ou CANCELADA)
        API-->>FE: 422 Aula não está em andamento
    else aula em andamento ou concluída
        API->>DB: BEGIN TRANSACTION
        
        loop para cada alunoId
            API->>DB: INSERT IGNORE Presenca { aulaId, alunoId, registradoPorId }\n(ON CONFLICT DO NOTHING — UNIQUE constraint)
            API->>DB: UPDATE Aluno SET aulasDesdePromocao += 1\n  WHERE id = alunoId
        end
        
        API->>DB: COMMIT
        DB-->>API: { criadas: N }
        API-->>FE: 200 { criadas: N, mensagem: "N presenças registradas" }
        FE-->>P: toast.success("N presenças registradas com sucesso!")
    end
```

---

## 6. Geração de Aulas a partir de Templates

```mermaid
sequenceDiagram
    actor ADM as Admin/Professor
    participant FE as Frontend
    participant API as Backend
    participant DB as PostgreSQL

    ADM->>FE: acessa /aulas/gerar
    ADM->>FE: seleciona: academiaId, dataInicio, dataFim
    ADM->>FE: clica "Gerar Aulas"

    FE->>API: POST /api/aulas/gerar\n{ academiaId, dataInicio: "2026-06-01", dataFim: "2026-06-30" }

    API->>DB: SELECT TemplateAula WHERE academiaId AND ativo = true
    DB-->>API: [template1 (SEGUNDA 07:30), template2 (QUARTA 07:30), ...]

    API->>API: itera cada dia no período\n(2026-06-01 a 2026-06-30)

    loop para cada dia do período
        API->>API: diaDaSemana = dayOfWeek(data)
        
        loop para cada template com diaSemana == diaDaSemana
            API->>API: dataHora = combina data + template.horarioInicio
            
            API->>DB: SELECT Aula WHERE academiaId AND dataHora (verifica se já existe)
            DB-->>API: aula existente ou null
            
            alt aula já existe
                API->>API: conta como "ignorada"
            else não existe
                API->>DB: INSERT Aula {\n  academiaId,\n  professorId: template.professorId,\n  dataHora,\n  duracao: template.duracao,\n  categoria: template.categoria,\n  modalidade: template.modalidade,\n  limiteAlunos: template.limiteAlunos,\n  status: AGENDADA\n}
                API->>API: conta como "criada"
            end
        end
    end

    API-->>FE: 201 { criadas: 22, ignoradas: 8 }
    FE-->>ADM: toast.success("22 aulas geradas para junho!")
```
