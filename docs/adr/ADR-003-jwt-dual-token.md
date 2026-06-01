# ADR-003: Estratégia JWT duplo (access token + refresh token)

**Status:** Aceito

## Contexto

O sistema precisa de autenticação stateless (compatível com serverless/Vercel) e segura. Os requisitos são:
- Sessão persistente (usuário não deve relogar a cada 15 minutos)
- Capacidade de invalidar sessões (logout)
- Sem estado no servidor (sem Redis ou sessões em memória)
- Compatível com múltiplas instâncias serverless

## Decisão

Usar **dois JWTs**:

| Token | TTL | Armazenamento | Uso |
|-------|-----|---------------|-----|
| **Access Token** | 15 minutos | Memória (Zustand) | Enviado em toda requisição via `Authorization: Bearer` |
| **Refresh Token** | 7 dias | localStorage (persist Zustand) + coluna `refreshToken` no BD | Usado apenas para renovar o access token |

Fluxo de renovação:
1. Access token expira → frontend intercepta 401
2. Frontend chama `POST /api/auth/refresh` com o refresh token
3. Backend valida JWT **e** compara com o valor armazenado no banco
4. Emite novo par de tokens (rotação do refresh token)
5. Frontend atualiza o store e reexecuta a requisição original

Invalidação de sessão (logout): simplesmente limpa o campo `refreshToken` no banco.

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Sessões + Redis** | Exige estado compartilhado — incompatível com serverless sem gerenciar Redis. Custo extra. |
| **Token único de longa duração** | Se vazado, compromete o usuário por dias/semanas. Sem capacidade de logout real. |
| **Cookies HttpOnly** | Mais seguro contra XSS, mas adiciona complexidade de CORS + SameSite. Rejeitado em favor de simplicidade (SPA com Axios). |
| **Auth externo (Auth0, Clerk)** | Adiciona dependência de serviço externo + custo. Controle de autenticação personalizado é viável dado o escopo. |

## Consequências

**Vantagens:**
- Stateless para access token (sem consulta ao BD por requisição)
- Refresh token no BD permite logout real e revogação
- Rotação de refresh token reduz janela de ataque

**Desvantagens:**
- Refresh token no localStorage está sujeito a XSS (mitigado por Helmet + CSP)
- Duas chamadas de rede no caso de token expirado (primeiro a requisição falha, depois o refresh)
- Lógica de interceptor no frontend é complexa (fila de requisições durante refresh)

## Regra importante

O Refresh Token no banco é **sobrescrito** a cada renovação. Um refresh token já usado é inválido mesmo que seu JWT ainda seja válido. Isso previne reuso de refresh tokens roubados.
