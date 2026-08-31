# QA Report — Jiujitsu Academy

**Data:** 14/06/2026
**Ambiente:** https://jiujitsu-frontend-tan.vercel.app
**Testado por:** Claude (QA automatizado)
**Usuário de teste:** bonow.arthur@gmail.com (perfil: PROFESSOR)

---

## Status atualizado (2026-08-30, revisão de código)

| Bug | Status | Observação |
|-----|--------|------------|
| BUG-01 | ✅ Corrigido | commit `a06bd22` |
| BUG-02 | ✅ Corrigido | commit `e571ef1` (modo Editar/Cancelar em vez de tela sempre editável) |
| BUG-03 | ✅ Corrigido | `app/not-found.tsx` customizado existe |
| BUG-04 | ✅ Corrigido | commit `a06bd22` |
| BUG-05 | ✅ Corrigido | commit `e571ef1` |
| BUG-06 | ✅ Corrigido | commit `e571ef1` |
| BUG-07 | ✅ Corrigido | Menu mobile com hambúrguer (`Sheet` + `SheetTrigger` em `components/layout/header.tsx`), sidebar oculta com `hidden md:block` e substituída por drawer em telas pequenas |
| BUG-08 | ✅ Corrigido | commit `e571ef1` |
| BUG-09 | ⚠️ Não verificável via código | Dado de teste ("Comedor de casadas") fica no banco, não no código-fonte — verificar/limpar diretamente no ambiente se ainda presente |
| BUG-10 | ✅ Corrigido | commit `e571ef1` (filtros em `/aulas`) |
| BUG-11 | ⚠️ Não verificado | Requer teste manual em navegador (race condition de hidratação) — não é possível confirmar por leitura estática de código |

**Melhorias sugeridas — status:**
- Paginação: ✅ implementada (`components/ui/data-table.tsx`)
- Ordenação por coluna: ✅ implementada (`@tanstack/react-table` `getSortedRowModel` em `data-table.tsx`)
- Título da aba dinâmico por página: ✅ implementado em 2026-08-31 (`hooks/use-page-title.ts`, chamado de dentro de `components/layout/page-header.tsx` — cobre praticamente toda rota autenticada automaticamente; login e 404 setados à parte)
- Página de detalhes somente-leitura: ✅ implementada para Alunos/Academias/Professores (modo Editar/Cancelar, ver BUG-02)

## Melhorias adicionais de mobile/UX (2026-08-31)

- **Teclado mobile correto por tipo de campo:** CPF, CEP e "Número" (endereço) agora usam `inputMode="numeric"`; campos de telefone usam `type="tel" inputMode="tel"` — antes todos abriam o teclado alfabético completo em mobile. Aplicado em `academia-form.tsx`, `aluno-form.tsx`, `professor-form.tsx` e no formulário público de pré-cadastro.
- **Alvos de toque:** os tamanhos `icon`/`icon-sm`/`icon-lg` do `Button` (usados nos menus "..." das tabelas, no gatilho do menu hambúrguer, etc.) foram de 32-36px para 36-48px, mais perto da recomendação de 44px (Apple HIG / WCAG 2.5.5). Mudança feita em `components/ui/button.tsx` a pedido explícito do usuário (esse diretório normalmente não é modificado).
- Build de produção (`next build`) e os 60 testes do frontend seguem passando após as mudanças.

---

## ✅ Funcionalidades OK

- Login com validação de campos, e-mail inválido e toast de sucesso
- Dashboard com cards de métricas carregando corretamente
- Busca de academias por nome
- Dropdown de ações (Editar / Ativar / Excluir) nas listagens
- Filtro de alunos por status (Ativo / Inativo / Inadimplente)
- Filtro de alunos por faixa (todas as faixas do Jiu-Jitsu presentes)
- Busca de alunos por nome, CPF ou e-mail
- Formulário de Pré-Cadastro público com validações robustas (nome, CPF, e-mail, data, sexo, modalidade)
- Checkbox de aceite LGPD no Pré-Cadastro
- Validação de senha no formulário de Configurações
- Página de Verificar Cadastro funcionando
- Estados vazios com mensagens amigáveis (Templates, Graduações, Planos, Matrículas, Mensalidades)

---

## 🐛 Bugs

### 🔴 BUG-01 — Vagas exibindo `0/undefined` em todas as aulas [CRÍTICO]

**Página:** `/aulas`  
**Descrição:** A coluna "Vagas" exibe `0/undefined` em 100% das aulas cadastradas. O campo `capacidade` da turma não está sendo resolvido corretamente, provavelmente um problema no relacionamento entre `Aula` e `Turma` na query ou no mapeamento de dados do frontend.  
**Comportamento esperado:** Exibir `{presentes}/{capacidade}`, ex: `5/20`.  
**Impacto:** Impossível saber a capacidade de qualquer aula.

---

### 🟠 BUG-02 — Clicar no nome de Academia/Aluno abre tela de Editar diretamente [ALTO]

**Páginas:** `/academias`, `/alunos`  
**Descrição:** O `<link>` no nome do item na listagem aponta diretamente para a rota de edição (ex: `/alunos/:id`), sem uma tela de visualização/detalhes intermediária. O usuário pode alterar dados acidentalmente.  
**Comportamento esperado:** Clicar no nome → tela de detalhes (somente leitura). Editar deve ser acessado via botão "Editar" ou opção no menu de ações (`...`).  
**Sugestão:** Criar rotas `/alunos/:id/detalhes` e `/academias/:id/detalhes`, ou tornar a tela atual somente leitura por padrão com um botão "Editar" para habilitar a edição.

---

### 🟠 BUG-03 — Página 404 sem personalização [ALTO]

**Página:** Qualquer rota inválida (ex: `/pagina-que-nao-existe`)  
**Descrição:** A página 404 é a padrão do Next.js com fundo preto, sem layout da aplicação, sem identidade visual e com texto em inglês ("This page could not be found.").  
**Comportamento esperado:** Página 404 personalizada em português, com o layout do sistema, botão de retorno ao Dashboard e mensagem amigável.  
**Sugestão:** Criar `app/not-found.tsx` (Next.js App Router) com layout e mensagem customizados.

---

### 🟠 BUG-04 — Professor não exibido na coluna "Professor" em Presenças [ALTO]

**Página:** `/presencas`  
**Descrição:** A coluna "Professor" exibe `-` em todos os registros de presença. O dado do professor associado à aula não está sendo carregado ou o campo não está sendo mapeado corretamente na resposta da API.  
**Comportamento esperado:** Exibir o nome do professor responsável pela aula em que a presença foi registrada.  
**Impacto:** Histórico de presenças incompleto.

---

### 🟡 BUG-05 — Ícone do toggle de senha invertido [MÉDIO]

**Página:** `/login`  
**Descrição:** Quando a senha está visível (`type="text"`), o ícone exibe o "olho com risco" (semântica de "ocultar"). Deveria ser o oposto: olho aberto = senha visível, olho com risco = senha oculta.  
**Comportamento esperado:** Inverter a lógica de qual ícone é exibido em cada estado.

---

### 🟡 BUG-06 — Ausência de botão "Voltar/Cancelar" nas telas de edição [MÉDIO]

**Páginas:** `/academias/:id`, `/alunos/:id` e demais telas de edição  
**Descrição:** As telas de edição possuem apenas o botão "Salvar Alterações". Não há botão de cancelar/voltar, forçando o usuário a usar o menu lateral ou o botão voltar do navegador.  
**Sugestão:** Adicionar botão "Cancelar" que redireciona para a listagem correspondente.

---

### 🟡 BUG-07 — Layout não responsivo em mobile [MÉDIO]

**Breakpoint:** 375px (iPhone)  
**Descrição:** O sidebar/menu lateral não colapsa em telas pequenas. Não existe menu hamburguer. O conteúdo principal fica comprimido ao lado do menu, tornando o sistema inutilizável em smartphones.  
**Sugestão:** Implementar sidebar colapsável com hamburguer menu para breakpoints abaixo de `md` (768px).

---

### 🔵 BUG-08 — Perfil exibido em CAPS no campo Configurações [BAIXO]

**Página:** `/configuracoes`  
**Descrição:** O campo "Perfil" exibe `PROFESSOR` em maiúsculas. O valor do enum está sendo renderizado diretamente sem formatação.  
**Sugestão:** Aplicar `capitalize` ou um mapeamento de label (ex: `PROFESSOR` → `Professor`, `ADMIN` → `Administrador`).

---

### 🔵 BUG-09 — Dado de teste inapropriado em Cadastros [BAIXO]

**Página:** `/cadastros`  
**Descrição:** Existe um registro com nome "Comedor de casadas" no ambiente. Dado de teste inadequado exposto na interface.  
**Sugestão:** Limpar dados de teste do banco antes de entregar para produção/homologação.

---

### 🔵 BUG-10 — Ausência de filtros e busca na página de Aulas [BAIXO/UX]

**Página:** `/aulas`  
**Descrição:** A listagem de aulas não possui nenhum filtro (por data, turma, professor ou status). Com o volume crescendo, a página ficará difícil de navegar.  
**Sugestão:** Adicionar filtros por período (data início/fim), turma, professor e status (Agendada / Concluída / Cancelada).

---

### 🔵 BUG-11 — Faixa do aluno pode não renderizar na primeira carga [BAIXO]

**Página:** `/alunos`  
**Descrição:** Na carga inicial sem filtros, o badge de faixa do aluno "Adalberto berto" não era exibido. Após aplicar um filtro e voltar, a faixa passou a aparecer. Possível problema de hidratação ou race condition na requisição.  
**Sugestão:** Investigar se o dado de faixa está presente na resposta da API na primeira chamada sem filtros.

---

## 📊 Resumo

| Severidade | Quantidade |
|---|---|
| 🔴 Crítico | 1 |
| 🟠 Alto | 3 |
| 🟡 Médio | 3 |
| 🔵 Baixo/UX | 4 |
| **Total** | **11** |

---

## 💡 Melhorias sugeridas (fora de bugs)

- **Paginação:** Nenhuma listagem possui paginação. Necessário antes de ir para produção com volume real de dados.
- **Ordenação por coluna:** Nenhuma coluna das tabelas é clicável para ordenar os dados.
- **Título da aba dinâmico:** Todas as páginas autenticadas compartilham o mesmo `<title>`. Adicionar o nome do módulo (ex: `Alunos | Jiujitsu Academy`).
- **Página de detalhes:** Criar telas de visualização (read-only) para Alunos, Academias e Professores, separadas das telas de edição.

---

## Como usar este relatório com o Claude Code

```
Leia o arquivo qa-report.md e corrija os bugs na seguinte ordem de prioridade:
1. BUG-01: Vagas exibindo 0/undefined nas aulas
2. BUG-02: Link do nome abrindo tela de edição diretamente
3. BUG-03: Página 404 sem personalização
4. BUG-04: Professor não exibido em Presenças
5. BUG-05: Ícone do toggle de senha invertido
6. BUG-06: Ausência de botão Cancelar nas telas de edição
7. BUG-07: Layout não responsivo em mobile
```