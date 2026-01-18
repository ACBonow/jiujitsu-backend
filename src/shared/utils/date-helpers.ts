import {
  addDays,
  addMonths,
  addMinutes,
  format,
  isAfter,
  isBefore,
  differenceInDays,
  differenceInYears,
  differenceInMonths,
  startOfDay,
  endOfDay,
  parseISO,
} from 'date-fns';

export const calcularIdade = (dataNascimento: Date): number => {
  return differenceInYears(new Date(), dataNascimento);
};

export const calcularDiasDesde = (data: Date): number => {
  return differenceInDays(new Date(), data);
};

export const calcularMesesDesde = (data: Date): number => {
  return differenceInMonths(new Date(), data);
};

export const formatarMesReferencia = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

export const formatarData = (date: Date, pattern: string = 'yyyy-MM-dd'): string => {
  return format(date, pattern);
};

export const formatarDataHora = (date: Date): string => {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
};

export const adicionarDias = (date: Date, dias: number): Date => {
  return addDays(date, dias);
};

export const adicionarMeses = (date: Date, meses: number): Date => {
  return addMonths(date, meses);
};

export const adicionarMinutos = (date: Date, minutos: number): Date => {
  return addMinutes(date, minutos);
};

export const inicioDodia = (date: Date): Date => {
  return startOfDay(date);
};

export const fimDoDia = (date: Date): Date => {
  return endOfDay(date);
};

export const eDepois = (data1: Date, data2: Date): boolean => {
  return isAfter(data1, data2);
};

export const eAntes = (data1: Date, data2: Date): boolean => {
  return isBefore(data1, data2);
};

export const parseData = (dataString: string): Date => {
  return parseISO(dataString);
};

export const calcularDataVencimento = (diaVencimento: number, mesReferencia: string): Date => {
  const [ano, mes] = mesReferencia.split('-').map(Number);
  return new Date(ano, mes - 1, diaVencimento);
};

export const obterProximoMes = (): string => {
  const proximoMes = addMonths(new Date(), 1);
  return formatarMesReferencia(proximoMes);
};

export const obterMesAtual = (): string => {
  return formatarMesReferencia(new Date());
};
