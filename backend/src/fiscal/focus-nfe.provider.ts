import { Injectable, Logger } from '@nestjs/common';
import { Tenant } from '../database/entities';

export interface NfceItemPayload {
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  ncm?: string;
  cfop?: string;
}

export interface NfceEmitPayload {
  referencia: string;
  cliente_cpf?: string | null;
  cliente_nome?: string | null;
  itens: NfceItemPayload[];
  valor_total: number;
}

export interface NfceEmitResult {
  sucesso: boolean;
  chave_acesso?: string;
  protocolo?: string;
  numero?: number;
  serie?: number;
  xml?: string;
  danfe_url?: string;
  mensagem_erro?: string;
  ambiente: string;
  provider: 'focus_nfe' | 'local_homologacao';
}

@Injectable()
export class FocusNfeProvider {
  private readonly logger = new Logger(FocusNfeProvider.name);
  private sequenceByTenant = new Map<string, number>();

  isConfigured(tenant: Tenant) {
    return Boolean(tenant.focusNfeToken?.trim());
  }

  async emit(tenant: Tenant, payload: NfceEmitPayload): Promise<NfceEmitResult> {
    if (this.isConfigured(tenant)) {
      return this.emitViaFocus(tenant, payload);
    }
    return this.emitLocalHomologacao(tenant, payload);
  }

  private nextNumber(tenantId: string) {
    const current = this.sequenceByTenant.get(tenantId) ?? 1;
    this.sequenceByTenant.set(tenantId, current + 1);
    return current;
  }

  private baseUrl(ambiente: string) {
    return ambiente === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';
  }

  private async emitViaFocus(
    tenant: Tenant,
    payload: NfceEmitPayload,
  ): Promise<NfceEmitResult> {
    const ambiente = tenant.focusNfeAmbiente || 'homologacao';
    const body = {
      natureza_operacao: 'VENDA AO CONSUMIDOR',
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      finalidade_emissao: 1,
      local_destino: 1,
      consumidor_final: 1,
      presenca_comprador: 1,
      modalidade_frete: 9,
      cnpj_emitente: tenant.cnpj,
      nome_destinatario: payload.cliente_nome || undefined,
      cpf_destinatario: payload.cliente_cpf || undefined,
      items: payload.itens.map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.codigo,
        descricao: item.descricao,
        codigo_ncm: item.ncm || '22030000',
        cfop: item.cfop || '5102',
        unidade_comercial: 'UN',
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: item.valor_unitario,
        valor_bruto: Number((item.quantidade * item.valor_unitario).toFixed(2)),
        unidade_tributavel: 'UN',
        quantidade_tributavel: item.quantidade,
        valor_unitario_tributavel: item.valor_unitario,
        origem_mercadoria: 0,
        icms_situacao_tributaria: '102',
      })),
      formas_pagamento: [
        { forma_pagamento: '99', valor_pagamento: payload.valor_total },
      ],
    };

    try {
      const auth = Buffer.from(`${tenant.focusNfeToken}:`).toString('base64');
      const response = await fetch(
        `${this.baseUrl(ambiente)}/v2/nfce?ref=${encodeURIComponent(payload.referencia)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        return {
          sucesso: false,
          mensagem_erro:
            (data.mensagem as string) ||
            (data.message as string) ||
            `Erro Focus NFe HTTP ${response.status}`,
          ambiente,
          provider: 'focus_nfe',
        };
      }
      return {
        sucesso: true,
        chave_acesso: (data.chave_nfe as string) || (data.chave_nfce as string),
        protocolo: data.protocolo as string | undefined,
        numero: data.numero as number | undefined,
        serie: (data.serie as number) || tenant.nfceSerie || 1,
        xml: data.caminho_xml_nota_fiscal
          ? `${this.baseUrl(ambiente)}${data.caminho_xml_nota_fiscal}`
          : undefined,
        danfe_url: data.caminho_danfe
          ? `${this.baseUrl(ambiente)}${data.caminho_danfe}`
          : undefined,
        ambiente,
        provider: 'focus_nfe',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na Focus NFe';
      this.logger.error(message);
      return {
        sucesso: false,
        mensagem_erro: message,
        ambiente,
        provider: 'focus_nfe',
      };
    }
  }

  private emitLocalHomologacao(
    tenant: Tenant,
    payload: NfceEmitPayload,
  ): NfceEmitResult {
    const numero = this.nextNumber(tenant.id);
    const serie = tenant.nfceSerie || 1;
    const cnpj = (tenant.cnpj || '00000000000000').replace(/\D/g, '');
    const chave = this.generateChaveAcesso(tenant, cnpj, serie, numero);
    const protocolo = `${Date.now()}`.slice(-15);
    const xml = this.buildXml(tenant, {
      chave,
      numero,
      serie,
      cnpj,
      payload,
      protocolo,
    });

    return {
      sucesso: true,
      chave_acesso: chave,
      protocolo,
      numero,
      serie,
      xml,
      ambiente: 'homologacao',
      provider: 'local_homologacao',
    };
  }

  private generateChaveAcesso(
    tenant: Tenant,
    cnpj: string,
    serie: number,
    numero: number,
  ): string {
    const uf = tenant.empresaUfCodigo || '13';
    const now = new Date();
    const aamm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cnpj14 = cnpj.padStart(14, '0').slice(0, 14);
    const mod = '65';
    const serie3 = String(serie).padStart(3, '0');
    const nNF = String(numero).padStart(9, '0');
    const tpEmis = '1';
    const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    const base = `${uf}${aamm}${cnpj14}${mod}${serie3}${nNF}${tpEmis}${cNF}`;
    return `${base}${this.mod11(base)}`;
  }

  private mod11(value: string): number {
    let sum = 0;
    let weight = 2;
    for (let i = value.length - 1; i >= 0; i -= 1) {
      sum += Number(value[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const mod = sum % 11;
    return mod === 0 || mod === 1 ? 0 : 11 - mod;
  }

  private buildXml(
    tenant: Tenant,
    params: {
      chave: string;
      numero: number;
      serie: number;
      cnpj: string;
      protocolo: string;
      payload: NfceEmitPayload;
    },
  ): string {
    const itensXml = params.payload.itens
      .map(
        (item, i) => `
    <det nItem="${i + 1}">
      <prod>
        <cProd>${item.codigo}</cProd>
        <xProd>${this.escapeXml(item.descricao)}</xProd>
        <NCM>${item.ncm || '22030000'}</NCM>
        <CFOP>${item.cfop || '5102'}</CFOP>
        <uCom>UN</uCom>
        <qCom>${item.quantidade}</qCom>
        <vUnCom>${item.valor_unitario.toFixed(2)}</vUnCom>
        <vProd>${(item.quantidade * item.valor_unitario).toFixed(2)}</vProd>
      </prod>
    </det>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe${params.chave}">
      <ide><mod>65</mod><serie>${params.serie}</serie><nNF>${params.numero}</nNF><tpAmb>2</tpAmb></ide>
      <emit>
        <CNPJ>${params.cnpj.padStart(14, '0')}</CNPJ>
        <xNome>${this.escapeXml(tenant.razaoSocial || tenant.nome)}</xNome>
      </emit>
      ${
        params.payload.cliente_cpf
          ? `<dest><CPF>${params.payload.cliente_cpf}</CPF></dest>`
          : ''
      }
      ${itensXml}
      <total><ICMSTot><vNF>${params.payload.valor_total.toFixed(2)}</vNF></ICMSTot></total>
      <pag><detPag><tPag>99</tPag><vPag>${params.payload.valor_total.toFixed(2)}</vPag></detPag></pag>
    </infNFe>
  </NFe>
  <protNFe><infProt><nProt>${params.protocolo}</nProt><cStat>100</cStat><chNFe>${params.chave}</chNFe></infProt></protNFe>
</nfeProc>`;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
