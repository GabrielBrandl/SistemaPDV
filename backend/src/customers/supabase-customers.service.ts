import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Customer } from '../database/entities';

export type SupabaseCustomerRow = {
  id?: string;
  tenant_id: string;
  nome: string;
  cpf: string;
  telefone: string;
  local_id?: string;
  updated_at?: string;
};

@Injectable()
export class SupabaseCustomersService {
  private readonly logger = new Logger(SupabaseCustomersService.name);
  private readonly url: string | undefined;
  private readonly key: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    this.key =
      this.config.get<string>('SUPABASE_SECRET_KEY') ||
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.config.get<string>('SUPABASE_PUBLISHABLE_KEY') ||
      this.config.get<string>('SUPABASE_ANON_KEY');
  }

  get enabled() {
    return Boolean(this.url && this.key);
  }

  private headers() {
    return {
      apikey: this.key!,
      Authorization: `Bearer ${this.key!}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  async upsertCustomer(customer: Customer): Promise<string | null> {
    if (!this.enabled) return null;

    const body: SupabaseCustomerRow = {
      tenant_id: customer.tenantId,
      nome: customer.nome,
      cpf: customer.cpf,
      telefone: customer.telefone,
      local_id: customer.id,
    };

    try {
      // Upsert por (tenant_id, cpf)
      const res = await fetch(
        `${this.url}/rest/v1/customers?on_conflict=tenant_id,cpf`,
        {
          method: 'POST',
          headers: {
            ...this.headers(),
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Supabase upsert falhou: ${res.status} ${text}`);
        return null;
      }

      const rows = (await res.json()) as Array<{ id: string }>;
      return rows[0]?.id ?? null;
    } catch (err) {
      this.logger.warn(`Supabase indisponível: ${(err as Error).message}`);
      return null;
    }
  }

  async findByCpf(
    tenantId: string,
    cpf: string,
  ): Promise<SupabaseCustomerRow | null> {
    if (!this.enabled) return null;

    try {
      const qs = new URLSearchParams({
        tenant_id: `eq.${tenantId}`,
        cpf: `eq.${cpf}`,
        select: '*',
        limit: '1',
      });
      const res = await fetch(`${this.url}/rest/v1/customers?${qs}`, {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as SupabaseCustomerRow[];
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }
}
