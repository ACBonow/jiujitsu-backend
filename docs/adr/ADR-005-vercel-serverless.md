# ADR-005: Vercel Serverless como plataforma de deploy

**Status:** Aceito

## Contexto

O backend Express precisa de uma plataforma de hospedagem. Os requisitos são:
- Deploy automatizado a partir de git push
- Suporte a cron jobs (mensalidades, reservas, inadimplência)
- Compatível com Neon PostgreSQL
- Custo baixo em fase inicial (tráfego irregular)

## Decisão

Usar **Vercel** com o adaptador `@vercel/node` para servir o Express como função serverless.

O arquivo `api/index.ts` é o entry point serverless (exporta o app Express).
Os cron jobs são configurados via `vercel.json` e protegidos por `CRON_SECRET`.

```json
// vercel.json (exemplo)
{
  "crons": [
    { "path": "/api/cron/atualizar-mensalidades", "schedule": "0 6 * * *" },
    { "path": "/api/cron/expirar-reservas", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/verificar-inadimplencia", "schedule": "0 9 * * *" }
  ]
}
```

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Railway** | Excelente para containers persistentes, mas custo mais alto para servidores always-on. Sem cron jobs nativos. |
| **Render** | Similar ao Railway. Cold start lento no plano gratuito. |
| **AWS Lambda** | Muito mais complexo de configurar. Sem cron integrado simples (precisaria de EventBridge). |
| **Fly.io** | Containers persistentes — ótimo para estado, desnecessário para API stateless. |
| **Heroku** | Histórico de mudanças de preços imprevisíveis. |

## Consequências

**Vantagens:**
- Deploy automático com preview URLs por branch
- Cron jobs gerenciados nativamente
- Integração nativa com Neon (parceiros Vercel)
- Plano gratuito generoso para MVP

**Desvantagens:**
- **Cold start**: primeira invocação após inatividade pode demorar 500ms-2s
- Timeout máximo de 60s por função (plano Pro) — operações longas devem ser evitadas
- Sem estado entre invocações — impossível usar cache em memória ou WebSockets nativos
- Prisma Client tem overhead de inicialização em cada cold start
