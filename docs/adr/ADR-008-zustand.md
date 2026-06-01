# ADR-008: Zustand para estado de autenticação

**Status:** Aceito

## Contexto

O estado de autenticação (usuário logado, tokens JWT) precisa ser:
- Persistido entre reloads de página (localStorage)
- Acessível em qualquer componente sem prop drilling
- Simples de atualizar (login, logout, refresh de token)

## Decisão

Usar **Zustand v5** com o middleware `persist` para armazenar o estado de auth no localStorage.

```typescript
// stores/auth-store.ts
interface AuthStore {
  user: Usuario | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;  // true após localStorage ser lido
  setAuth: (data: AuthData) => void;
  logout: () => void;
}
```

O `isHydrated` previne flash de conteúdo: o layout aguarda hidratação antes de decidir redirecionar para login.

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Redux + redux-persist** | Boilerplate excessivo para um único slice de auth. |
| **Context API** | Causa re-renders desnecessários. Sem persist nativo. |
| **Jotai / Recoil** | Alternativas válidas, mas Zustand tem API mais simples e persist built-in. |
| **Cookies (httpOnly)** | Mais seguro contra XSS mas exige lógica SSR complexa com App Router. |

## Consequências

**Vantagens:**
- API minimalista (menos de 30 linhas de store)
- `persist` middleware integrado — sem biblioteca extra
- `isHydrated` resolve o problema de SSR/hidratação do Next.js

**Desvantagens:**
- Tokens em localStorage estão sujeitos a XSS (mitigado por Helmet/CSP no backend)
- `isHydrated` exige lógica explícita no layout para evitar flash
