import { Modalidade, StatusMatricula, StatusMensalidade, FormaPagamento } from '@prisma/client';

// Plano
export interface PlanoResponse {
  id: string;
  nome: string;
  descricao: string | null;
  valorBase: number;
  modalidades: Modalidade[];
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Matrícula
export interface MatriculaResponse {
  id: string;
  valorFinal: number;
  desconto: number | null;
  diaVencimento: number;
  dataInicio: Date;
  dataFim: Date | null;
  status: StatusMatricula;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  aluno: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
  academia: {
    id: string;
    nome: string;
  };
  plano: {
    id: string;
    nome: string;
    modalidades: Modalidade[];
  };
}

export interface MatriculaListResponse {
  id: string;
  valorFinal: number;
  status: StatusMatricula;
  dataInicio: Date;
  aluno: {
    pessoa: {
      nome: string;
    };
  };
  plano: {
    nome: string;
  };
}

// Mensalidade
export interface MensalidadeResponse {
  id: string;
  mesReferencia: string;
  valorOriginal: number;
  valorPago: number | null;
  descontoAplicado: number | null;
  dataVencimento: Date;
  dataPagamento: Date | null;
  formaPagamento: FormaPagamento | null;
  status: StatusMensalidade;
  observacoes: string | null;
  pagamentoLoteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  matricula: {
    id: string;
    aluno: {
      id: string;
      pessoa: {
        nome: string;
      };
    };
    academia: {
      id: string;
      nome: string;
    };
  };
}

export interface MensalidadeListResponse {
  id: string;
  mesReferencia: string;
  valorOriginal: number;
  valorPago: number | null;
  dataVencimento: Date;
  status: StatusMensalidade;
  matricula: {
    aluno: {
      pessoa: {
        nome: string;
      };
    };
    academia: {
      id: string;
      nome: string;
    };
  };
}

// Regra de Pagamento
export interface RegraPagamentoResponse {
  id: string;
  academiaId: string;
  descontoAntecipadoPercentual: number | null;
  diaLimiteAntecipado: number | null;
  descontoPagamentoImediatoPercentual: number | null;
  formasPagamentoComDesconto: FormaPagamento[];
  descontosAcumulativos: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Pagamento (preview e lote)
export interface PreviewPagamentoItem {
  mensalidadeId: string;
  alunoNome: string;
  mesReferencia: string;
  valorOriginal: number;
  percentualAplicado: number;
  descontoValor: number;
  valorFinal: number;
}

export interface PreviewPagamentoResponse {
  itens: PreviewPagamentoItem[];
  valorTotal: number;
  descontoTotal: number;
}

export interface PagamentoLoteResponse {
  id: string;
  academiaId: string;
  formaPagamento: FormaPagamento;
  dataPagamento: Date;
  valorTotal: number;
  descontoTotal: number;
  observacoes: string | null;
  createdAt: Date;
  mensalidades: {
    id: string;
    mesReferencia: string;
    valorOriginal: number;
    valorPago: number | null;
    aluno: {
      pessoa: {
        nome: string;
      };
    };
  }[];
}

export interface CreatePlanoData {
  nome: string;
  descricao?: string | null;
  valorBase: number;
  modalidades: Modalidade[];
}

export interface CreateMatriculaData {
  alunoId: string;
  academiaId: string;
  planoId: string;
  valorFinal?: number;
  desconto?: number | null;
  diaVencimento: number;
  dataInicio?: Date;
  dataFim?: Date | null;
  observacoes?: string | null;
}
