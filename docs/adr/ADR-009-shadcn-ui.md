# ADR-009: shadcn/ui como biblioteca de componentes

**Status:** Aceito

## Contexto

O dashboard precisa de uma biblioteca de componentes que seja:
- Acessível (WAI-ARIA compliant)
- Customizável com Tailwind CSS
- Compatível com React 19
- Sem vendor lock-in — componentes são copiados para o projeto

## Decisão

Usar **shadcn/ui** — uma coleção de componentes baseada em **Radix UI** (primitivos acessíveis) estilizados com **Tailwind CSS**.

Os componentes ficam em `components/ui/` e são parte do código-fonte (não são npm packages). Isso significa:
- Podemos modificar qualquer componente sem fork
- Sem atualizações de dependência quebrando estilos
- Componentes são auditáveis

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Material UI (MUI)** | Estilos MUI conflitam com Tailwind. Difícil de customizar sem `!important`. |
| **Chakra UI** | Performance inferior (CSS-in-JS). Compatibilidade limitada com React 19 no momento. |
| **Ant Design** | Design system muito opinionado. Difícil de customizar para identidade visual própria. |
| **Tailwind UI** | Pago. Não inclui primitivos acessíveis (só HTML/CSS). |
| **Headless UI** | Apenas Tailwind, sem componentes prontos como Calendar, DataTable, Command. |

## Consequências

**Vantagens:**
- Componentes acessíveis via Radix UI (focus trap, keyboard navigation, aria)
- Tailwind para styling = consistência com o resto do projeto
- Zero dependência de runtime extra (não é um npm package)
- Inclui componentes complexos prontos: Calendar, Command (search), DataTable, Dialog

**Desvantagens:**
- Atualizações de componentes são manuais (copiar nova versão do shadcn)
- Componentes em `components/ui/` não devem ser modificados diretamente (risco de divergir da versão original)
- Mais arquivos no projeto comparado a um import de npm
