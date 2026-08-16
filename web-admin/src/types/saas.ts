export type TenantPlanId = 'free' | 'starter' | 'pro' | 'enterprise';
export type TenantStatusId = 'trial' | 'active' | 'suspended' | 'cancelled';
export type InvoiceStatusId = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type TeamRole = 'admin' | 'operator' | 'exit';

export type PlanDefinition = {
  id: TenantPlanId;
  nome: string;
  descricao: string;
  preco_mensal: number;
  preco_anual: number;
  trial_dias: number;
  destaque?: boolean;
  limites: {
    max_terminais: number;
    max_eventos: number;
    max_usuarios: number;
    max_cartoes: number;
  };
  recursos: string[];
};

export type TenantRecord = {
  id: string;
  nome: string;
  slug: string;
  razaoSocial: string | null;
  cnpj: string | null;
  plano: TenantPlanId;
  status: TenantStatusId;
  emailContato: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  notasInternas: string | null;
  maxTerminais: number;
  maxEventos: number;
  maxUsuarios: number;
  cicloCobranca: string;
  valorMensal: number | string;
  proximaCobranca: string | null;
  trialAte: string | null;
  criadoEm: string;
};

export type CompanyMetrics = {
  usuarios: number;
  eventos: number;
  terminais: number;
  cartoes: number;
  comandas: number;
};

export type CompanyListItem = TenantRecord & {
  metrics: CompanyMetrics;
  plan_def: PlanDefinition;
};

export type PlatformOverview = {
  empresas: number;
  mrr: number;
  by_status: {
    trial: number;
    active: number;
    suspended: number;
    cancelled: number;
  };
  by_plan: { plano: TenantPlanId; nome: string; total: number }[];
  admins_cadastrados: number;
  faturas_pendentes: number;
  recentes: TenantRecord[];
  planos: PlanDefinition[];
};

export type PlatformUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  ativo: boolean;
  telefone: string | null;
  criadoEm: string;
};

export type SubscriptionInvoice = {
  id: string;
  tenantId: string;
  valor: number | string;
  status: InvoiceStatusId;
  ciclo: string;
  descricao: string | null;
  periodoInicio: string;
  periodoFim: string;
  pagoEm: string | null;
  criadoEm: string;
};

export type AuditLogItem = {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  acao: string;
  detalhe: string | null;
  criadoEm: string;
};

export type CompanyDetail = {
  tenant: TenantRecord;
  plan_def: PlanDefinition;
  users: PlatformUser[];
  events: { id: string; nome: string; dataInicio?: string }[];
  terminals: { id: string; nome?: string; codigo?: string }[];
  cards: number;
  invoices: SubscriptionInvoice[];
  audit: AuditLogItem[];
  gmv_pagamentos: number;
};

export type TeamUser = {
  id: string;
  email: string;
  name: string;
  role: TeamRole | string;
  ativo: boolean;
  telefone: string | null;
  criadoEm?: string;
};
