/** Matriz única de papéis e ações — fonte de verdade front/back */

export const AppRoles = [
  'platform_admin',
  'tenant_admin',
  'supervisor',
  'cashier',
  'bartender',
  'exit',
] as const;

export type AppRole = (typeof AppRoles)[number];

/** Papéis legados → novos (compatibilidade) */
export const LEGACY_ROLE_MAP: Record<string, AppRole> = {
  super_admin: 'platform_admin',
  admin: 'tenant_admin',
  operator: 'bartender',
  exit: 'exit',
  platform_admin: 'platform_admin',
  tenant_admin: 'tenant_admin',
  supervisor: 'supervisor',
  cashier: 'cashier',
  bartender: 'bartender',
};

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  return LEGACY_ROLE_MAP[role] ?? null;
}

export type Permission =
  | 'platform.manage'
  | 'tenant.manage'
  | 'team.manage'
  | 'billing.view'
  | 'events.manage'
  | 'products.manage'
  | 'reports.view'
  | 'cards.manage'
  | 'recharge.create'
  | 'pos.sell'
  | 'exit.control'
  | 'cash.open'
  | 'cash.close'
  | 'refund.approve'
  | 'terminals.manage'
  | 'integrations.manage'
  | 'fiscal.manage'
  | 'customers.manage'
  | 'audit.view';

const ALL_TENANT: Permission[] = [
  'tenant.manage',
  'team.manage',
  'billing.view',
  'events.manage',
  'products.manage',
  'reports.view',
  'cards.manage',
  'recharge.create',
  'pos.sell',
  'exit.control',
  'cash.open',
  'cash.close',
  'refund.approve',
  'terminals.manage',
  'integrations.manage',
  'fiscal.manage',
  'customers.manage',
  'audit.view',
];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  platform_admin: ['platform.manage', 'audit.view'],
  tenant_admin: ALL_TENANT,
  supervisor: [
    'events.manage',
    'products.manage',
    'reports.view',
    'cards.manage',
    'recharge.create',
    'pos.sell',
    'exit.control',
    'cash.open',
    'cash.close',
    'refund.approve',
    'terminals.manage',
    'customers.manage',
    'audit.view',
  ],
  cashier: [
    'recharge.create',
    'cards.manage',
    'customers.manage',
    'cash.open',
    'cash.close',
  ],
  bartender: ['pos.sell', 'products.manage'],
  exit: ['exit.control'],
};

export function can(role: string | null | undefined, permission: Permission): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  return ROLE_PERMISSIONS[r].includes(permission);
}

export function homePathForRole(role: string | null | undefined): string {
  const r = normalizeRole(role);
  switch (r) {
    case 'platform_admin':
      return '/platform';
    case 'tenant_admin':
    case 'supervisor':
      return '/';
    case 'cashier':
      return '/t/recarga';
    case 'bartender':
      return '/t/pos';
    case 'exit':
      return '/t/saida';
    default:
      return '/login';
  }
}

export const NAV_BY_PERMISSION: { to: string; label: string; permission: Permission }[] = [
  { to: '/platform', label: 'Plataforma', permission: 'platform.manage' },
  { to: '/tenants', label: 'Empresas', permission: 'platform.manage' },
  { to: '/precos', label: 'Planos', permission: 'platform.manage' },
  { to: '/equipe', label: 'Equipe', permission: 'team.manage' },
  { to: '/billing', label: 'Assinatura', permission: 'billing.view' },
  { to: '/admin', label: 'Controle Admin', permission: 'tenant.manage' },
  { to: '/cadastro', label: 'Clientes', permission: 'customers.manage' },
  { to: '/t/pos', label: 'PDV Terminal', permission: 'pos.sell' },
  { to: '/pos', label: 'PDV Web', permission: 'pos.sell' },
  { to: '/t/saida', label: 'Saída', permission: 'exit.control' },
  { to: '/saida', label: 'Saída (web)', permission: 'exit.control' },
  { to: '/', label: 'Dashboard', permission: 'reports.view' },
  { to: '/cards', label: 'Pulseiras', permission: 'cards.manage' },
  { to: '/t/recarga', label: 'Recarga', permission: 'recharge.create' },
  { to: '/recharge', label: 'Recarga (web)', permission: 'recharge.create' },
  { to: '/products', label: 'Cardápio', permission: 'products.manage' },
  { to: '/reports', label: 'Relatórios', permission: 'reports.view' },
  { to: '/pdv', label: 'Terminais', permission: 'terminals.manage' },
  { to: '/fiscal', label: 'Emissor NFC-e', permission: 'fiscal.manage' },
  { to: '/integrations', label: 'Integrações', permission: 'integrations.manage' },
];
