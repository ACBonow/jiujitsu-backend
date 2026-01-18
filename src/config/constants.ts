export const CONSTANTS = {
  // Reservas
  LIMITE_FALTAS_RESERVA: 3,
  CONFIRMACAO_MINUTOS: 15,

  // Financeiro
  DIAS_INADIMPLENCIA: 30,
  DIA_GERACAO_MENSALIDADES: 25, // Dia do mês para gerar mensalidades

  // Segurança
  SALT_ROUNDS_BCRYPT: 10,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_LOGIN_MAX: 5, // 5 tentativas de login

  // Aulas
  DURACAO_AULA_PADRAO: 60, // minutos

  // Requisitos de promoção (baseado em regras IBJJF aproximadas)
  REQUISITOS_PROMOCAO: {
    // Kids (meses mínimos)
    BRANCA_CINZA: { aulasMinimas: 80, tempoMesesMinimo: 12 },
    CINZA_AMARELA: { aulasMinimas: 80, tempoMesesMinimo: 12 },
    AMARELA_LARANJA: { aulasMinimas: 80, tempoMesesMinimo: 12 },
    LARANJA_VERDE: { aulasMinimas: 80, tempoMesesMinimo: 12 },

    // Adulto (meses mínimos)
    BRANCA_AZUL: { aulasMinimas: 150, tempoMesesMinimo: 24 },
    AZUL_ROXA: { aulasMinimas: 200, tempoMesesMinimo: 24 },
    ROXA_MARROM: { aulasMinimas: 250, tempoMesesMinimo: 24 },
    MARROM_PRETA: { aulasMinimas: 300, tempoMesesMinimo: 24 },

    // Faixa preta (graus - anos mínimos)
    PRETA_1_GRAU: { aulasMinimas: 0, tempoMesesMinimo: 36 },
    PRETA_2_GRAU: { aulasMinimas: 0, tempoMesesMinimo: 36 },
    PRETA_3_GRAU: { aulasMinimas: 0, tempoMesesMinimo: 36 },
    PRETA_4_GRAU: { aulasMinimas: 0, tempoMesesMinimo: 36 },
    PRETA_5_GRAU: { aulasMinimas: 0, tempoMesesMinimo: 36 },
    PRETA_6_GRAU: { aulasMinimas: 0, tempoMesesMinimo: 36 },
  },

  // Tabelas de peso IBJJF (kg) - Masculino Adulto
  PESO_IBJJF_MASCULINO_ADULTO: {
    GALO: { min: 0, max: 57.5 },
    PLUMA: { min: 57.5, max: 64 },
    PENA: { min: 64, max: 70 },
    LEVE: { min: 70, max: 76 },
    MEDIO: { min: 76, max: 82.3 },
    MEIO_PESADO: { min: 82.3, max: 88.3 },
    PESADO: { min: 88.3, max: 94.3 },
    SUPER_PESADO: { min: 94.3, max: 100.5 },
    PESADISSIMO: { min: 100.5, max: Infinity },
  },

  // Tabelas de peso IBJJF (kg) - Feminino Adulto
  PESO_IBJJF_FEMININO_ADULTO: {
    GALO: { min: 0, max: 48.5 },
    PLUMA: { min: 48.5, max: 53.5 },
    PENA: { min: 53.5, max: 58.5 },
    LEVE: { min: 58.5, max: 64 },
    MEDIO: { min: 64, max: 69 },
    MEIO_PESADO: { min: 69, max: 74 },
    PESADO: { min: 74, max: 79.3 },
    SUPER_PESADO: { min: 79.3, max: Infinity },
  },

  // Paginação
  PAGINATION_DEFAULT_LIMIT: 10,
  PAGINATION_MAX_LIMIT: 100,

  // Mensagens de erro comuns
  ERRORS: {
    UNAUTHORIZED: 'Não autorizado',
    FORBIDDEN: 'Acesso negado',
    NOT_FOUND: 'Recurso não encontrado',
    INVALID_CREDENTIALS: 'Email ou senha inválidos',
    EXPIRED_TOKEN: 'Token expirado',
    INVALID_TOKEN: 'Token inválido',
    VALIDATION_ERROR: 'Erro de validação',
    ALREADY_EXISTS: 'Registro já existe',
    INTERNAL_ERROR: 'Erro interno do servidor',
  },
};
