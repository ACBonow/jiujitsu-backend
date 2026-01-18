export interface PaginationQuery {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  dataInicio?: string | Date;
  dataFim?: string | Date;
}

export interface SearchFilter {
  search?: string;
}

export interface StatusFilter {
  status?: string;
}

export type FilterOperator = 'equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface GenericFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface Endereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}
