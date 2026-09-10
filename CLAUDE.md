# CLAUDE.md — jiujitsu-backend

Sistema de gestão de academias de artes marciais. Backend Node.js/TypeScript com Express e Prisma.

## Documentação

- `docs/SDD.md` — Especificação completa: domínio, módulos, regras de negócio, API
- `docs/TDD.md` — Guia de testes: setup, padrões, helpers, lista de comportamentos a cobrir
- `docs/API.md` — Referência detalhada de todos os endpoints (request/response/erros)
- `docs/GLOSSARY.md` — Glossário de domínio: definições precisas de todos os termos do negócio
- `docs/USER-STORIES.md` — Histórias de usuário por perfil com critérios de aceitação (Given/When/Then)
- `docs/STATE-MACHINES.md` — Máquinas de estado (Mermaid) para Aula, Reserva, Mensalidade, etc.
- `docs/SEQUENCES.md` — Diagramas de sequência (Mermaid) para os fluxos críticos do sistema
- `docs/SETUP.md` — Guia completo de setup local (banco, env, migrations, seed, testes)
- `docs/SECURITY.md` — Análise de segurança completa: 20 vulnerabilidades com remediação (5 críticas, 6 altas, 5 médias, 4 baixas)
- `docs/adr/` — Architecture Decision Records: por que cada decisão técnica foi tomada
- `CONTRIBUTING.md` — Fluxo de trabalho SDD+TDD, convenções, passo a passo de novas features

**Ordem de leitura recomendada para IA:**
1. `GLOSSARY.md` → entender os termos
2. `USER-STORIES.md` → entender o PORQUÊ
3. `SDD.md` → entender o COMO
4. `STATE-MACHINES.md` → entender ciclos de vida
5. `API.md` → contratos de interface

## Regras importantes

1. Nunca deletar fisicamente registros de `Pessoa`, `Aluno`, `Professor`, `Academia` — usar `ativo = false`
2. `Graduacao` é append-only — nunca deletar ou editar registros de graduação
3. `Mensalidade` é única por `(matriculaId, mesReferencia)`
4. `Presenca` é única por `(aulaId, alunoId)`
5. Validar com Zod em todo endpoint que recebe body — usar `validateBody` middleware
6. Autorizar com `authenticate` + `authorize([Perfil.X, ...])` em todas as rotas protegidas
7. Lógica de negócio fica no Service, nunca no Controller ou Repository
