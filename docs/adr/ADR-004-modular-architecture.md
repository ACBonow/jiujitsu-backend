# ADR-004: Arquitetura modular (Controller → Service → Repository)

**Status:** Aceito

## Contexto

O backend tem ~10 domínios de negócio independentes (auth, alunos, aulas, financeiro, etc.). Precisamos de uma estrutura que:
- Separe responsabilidades claramente (para TDD eficaz)
- Permita crescimento sem criar arquivos monolíticos
- Seja familiar e previsível para qualquer desenvolvedor
- Facilite mocking nos testes

## Decisão

Cada domínio é um **módulo autônomo** com 4 camadas:

```
routes.ts      → Define endpoints e aplica middlewares (auth, validação)
controller.ts  → Extrai dados do req, chama service, formata res
service.ts     → Lógica de negócio pura (testável sem HTTP)
repository.ts  → Queries Prisma (isoladas para fácil troca de ORM)
schemas.ts     → Schemas Zod de validação de entrada
```

**Regras de dependência:**
- Routes importa Controller + Middlewares
- Controller importa Service
- Service importa Repository
- Repository importa Prisma Client
- Nenhuma camada pula a camada anterior

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Domain-Driven Design (DDD) completo** | Agregados, Value Objects e Events são overhead desnecessário para este tamanho de sistema |
| **Arquitetura por tipo de arquivo** (`/controllers`, `/services`, `/models`)| Arquivos de um mesmo domínio ficam espalhados em pastas distantes. Dificulta localização. |
| **Fat Controller (tudo no controller)** | Impossibilita testes unitários de lógica de negócio. |
| **Active Record (lógica no model)** | Não aplicável com Prisma (que usa o padrão Data Mapper). |

## Consequências

**Vantagens:**
- `service.ts` pode ser testado unitariamente sem instanciar HTTP
- Troca de ORM requer mudanças apenas no `repository.ts`
- Novo desenvolvedor ou IA encontra exatamente onde cada tipo de código deve estar
- Módulos são independentes: adicionar um novo domínio é copiar a estrutura

**Desvantagens:**
- Mais arquivos por funcionalidade (4 ao invés de 1)
- Para features simples (CRUD puro), o service vira um pass-through do repository
