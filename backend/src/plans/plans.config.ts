import { TenantPlan } from '../database/entities/tenant.entity';

export type PlanDefinition = {
  id: TenantPlan;
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

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: TenantPlan.FREE,
    nome: 'Free',
    descricao: 'Para testar o fluxo cashless em eventos pequenos.',
    preco_mensal: 0,
    preco_anual: 0,
    trial_dias: 7,
    limites: {
      max_terminais: 1,
      max_eventos: 1,
      max_usuarios: 2,
      max_cartoes: 50,
    },
    recursos: [
      'PDV comanda NFC',
      'Controle de saída',
      '1 terminal',
      'Relatórios básicos',
      'Modo pagamento demo',
    ],
  },
  {
    id: TenantPlan.STARTER,
    nome: 'Starter',
    descricao: 'Ideal para bares e casas noturnas em crescimento.',
    preco_mensal: 297,
    preco_anual: 2970,
    trial_dias: 14,
    limites: {
      max_terminais: 5,
      max_eventos: 5,
      max_usuarios: 10,
      max_cartoes: 2000,
    },
    recursos: [
      'Tudo do Free',
      'Cadastro e check-in de clientes',
      'Até 5 terminais PDV',
      'PIX + SoftPOS (demo/produção)',
      'NFC-e homologação',
      'Equipe com papéis (admin/operador/saída)',
      'Suporte por e-mail',
    ],
  },
  {
    id: TenantPlan.PRO,
    nome: 'Pro',
    descricao: 'Operação completa estilo Zig — multi-evento e escala.',
    preco_mensal: 797,
    preco_anual: 7970,
    trial_dias: 14,
    destaque: true,
    limites: {
      max_terminais: 25,
      max_eventos: 30,
      max_usuarios: 50,
      max_cartoes: 20000,
    },
    recursos: [
      'Tudo do Starter',
      'Até 25 terminais / 30 eventos',
      'NFC-e produção (Focus)',
      'Integrações (webhooks/API)',
      'Dashboard operacional em tempo real',
      'Impersonação suporte (plataforma)',
      'Prioridade no suporte',
    ],
  },
  {
    id: TenantPlan.ENTERPRISE,
    nome: 'Enterprise',
    descricao: 'Redes, festivais e white-label com limites customizados.',
    preco_mensal: 2497,
    preco_anual: 24970,
    trial_dias: 30,
    limites: {
      max_terminais: 999,
      max_eventos: 999,
      max_usuarios: 500,
      max_cartoes: 500000,
    },
    recursos: [
      'Tudo do Pro',
      'Limites ilimitados negociáveis',
      'SLA e gerente de conta',
      'Onboarding assistido',
      'Ambiente dedicado (opcional)',
      'Contrato e faturamento sob demanda',
    ],
  },
];

export function getPlanDefinition(plano: TenantPlan): PlanDefinition {
  return (
    PLAN_CATALOG.find((p) => p.id === plano) ??
    PLAN_CATALOG.find((p) => p.id === TenantPlan.STARTER)!
  );
}

export function applyPlanLimits(plano: TenantPlan) {
  const def = getPlanDefinition(plano);
  return {
    maxTerminais: def.limites.max_terminais,
    maxEventos: def.limites.max_eventos,
    maxUsuarios: def.limites.max_usuarios,
  };
}
