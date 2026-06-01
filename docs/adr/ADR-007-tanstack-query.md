# ADR-007: TanStack Query para estado de servidor

**Status:** Aceito

## Contexto

O frontend faz múltiplas chamadas à API. Precisamos de:
- Cache automático para evitar refetches desnecessários
- Invalidação de cache após mutations
- Loading/error states padronizados
- Integração com React 19 e Next.js App Router

## Decisão

Usar **TanStack Query v5** (`@tanstack/react-query`) para todo estado que vem do servidor.

Padrão de hook por domínio:
```typescript
// Queries: useQuery com queryKey tipada
export function useAlunos(params?) {
  return useQuery({ queryKey: ['alunos', params], queryFn: () => alunosService.listar(params) });
}

// Mutations: useMutation com invalidação de cache no onSuccess
export function useCriarAluno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: alunosService.criar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  });
}
```

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **SWR** | Mais simples, mas menos poderoso (sem mutations nativas, invalidação manual). |
| **Redux Toolkit Query (RTK Query)** | Overengineered para este contexto. Redux traz boilerplate desnecessário. |
| **useState + useEffect manual** | Sem cache, sem deduplicação, sem refetch automático. Difícil de manter. |
| **Zustand para todo o estado** | Zustand é para estado de UI/auth — não é otimizado para sincronização com servidor. |

## Consequências

**Vantagens:**
- Cache automático com stale-while-revalidate
- Deduplicação de requisições paralelas idênticas
- `refetchOnWindowFocus` mantém dados atualizados
- DevTools disponíveis para debugging

**Desvantagens:**
- `QueryClientProvider` precisa envolver toda a app
- `queryKey` precisa ser gerenciada com cuidado (invalidações incorretas causam dados stale)
- Curva de aprendizado para o padrão de invalidação
