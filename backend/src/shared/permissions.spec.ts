import { can, homePathForRole, normalizeRole } from './permissions';

describe('permissions matrix', () => {
  it('maps legacy roles', () => {
    expect(normalizeRole('super_admin')).toBe('platform_admin');
    expect(normalizeRole('admin')).toBe('tenant_admin');
    expect(normalizeRole('operator')).toBe('bartender');
  });

  it('cashier can recharge but not sell', () => {
    expect(can('cashier', 'recharge.create')).toBe(true);
    expect(can('cashier', 'pos.sell')).toBe(false);
    expect(can('operator', 'pos.sell')).toBe(true);
  });

  it('exit only exit.control', () => {
    expect(can('exit', 'exit.control')).toBe(true);
    expect(can('exit', 'recharge.create')).toBe(false);
  });

  it('home paths', () => {
    expect(homePathForRole('cashier')).toBe('/t/recarga');
    expect(homePathForRole('bartender')).toBe('/t/pos');
    expect(homePathForRole('exit')).toBe('/t/saida');
    expect(homePathForRole('super_admin')).toBe('/platform');
  });
});
