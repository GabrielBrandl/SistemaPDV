import { useState, type ReactNode } from 'react';
import { formatBRL } from '../../shared/format';

/** As 3 maquininhas suportadas na landing. */
export type TerminalMachine = 'cielo' | 'caixa' | 'laranjinha';

export const TERMINAL_MACHINES: Record<
  TerminalMachine,
  { id: TerminalMachine; label: string; short: string; nfcDefault: string }
> = {
  cielo: {
    id: 'cielo',
    label: 'Cielo Smart',
    short: 'Cielo',
    nfcDefault: 'Aproxime a pulseira NFC',
  },
  caixa: {
    id: 'caixa',
    label: 'PagBank · Caixa',
    short: 'Caixa',
    nfcDefault: 'Aproxime a pulseira NFC',
  },
  laranjinha: {
    id: 'laranjinha',
    label: 'Mercado Pago',
    short: 'Laranjinha',
    nfcDefault: 'Aproxime a pulseira NFC',
  },
};

const PRODUCTS = [
  { nome: 'Cerveja lata', valor: 4120, max: 4120 },
  { nome: 'Chopp 300ml', valor: 3380, max: 4120 },
  { nome: 'Gin tônica', valor: 2890, max: 4120 },
  { nome: 'Água', valor: 1540, max: 4120 },
  { nome: 'Energético', valor: 1210, max: 4120 },
];

const POS_ITEMS = [
  { cat: 'Cervejas', nome: 'Cerveja Lata', preco: 12, tone: 'amber' },
  { cat: 'Cervejas', nome: 'Chopp 300ml', preco: 14, tone: 'amber' },
  { cat: 'Drinks', nome: 'Gin Tônica', preco: 28, tone: 'teal' },
  { cat: 'Drinks', nome: 'Caipirinha', preco: 22, tone: 'teal' },
  { cat: 'Sem álcool', nome: 'Água', preco: 5, tone: 'sky' },
  { cat: 'Sem álcool', nome: 'Energético', preco: 12, tone: 'sky' },
  { cat: 'Comidas', nome: 'Porção Batata', preco: 18, tone: 'rose' },
  { cat: 'Comidas', nome: 'Hambúrguer', preco: 25, tone: 'rose' },
];

const CART = [
  { nome: 'Cerveja Lata', qtd: 2, preco: 12 },
  { nome: 'Gin Tônica', qtd: 1, preco: 28 },
  { nome: 'Água', qtd: 1, preco: 5 },
];

type ShellProps = {
  children: ReactNode;
  machine?: TerminalMachine;
  glow?: boolean;
  nfcHint?: string;
  caption?: string;
};

/** Chassis físico — troque `machine` entre cielo | caixa | laranjinha. */
export function TerminalShell({
  children,
  machine = 'cielo',
  glow = false,
  nfcHint,
  caption,
}: ShellProps) {
  const meta = TERMINAL_MACHINES[machine];
  return (
    <figure
      className={`term term-${machine} ${glow ? 'is-glow' : ''}`}
      data-machine={machine}
    >
      {caption ? <figcaption className="term-caption">{caption}</figcaption> : null}
      <div className="term-body">
        <div className="term-earpiece" aria-hidden />
        <div className="term-cam" aria-hidden />
        <div className="term-screen">{children}</div>
        <div className="term-nfc" aria-hidden>
          <span className="term-nfc-ring" />
          <span className="term-nfc-ring delay" />
          <span className="term-nfc-waves" />
          <small>{nfcHint ?? meta.nfcDefault}</small>
        </div>
        <div className="term-chin">
          <span className="term-led" />
          <span className="term-brand">{meta.label}</span>
          <span className="term-speaker" />
        </div>
      </div>
      <div className="term-stand" aria-hidden />
    </figure>
  );
}

/** Seletor das 3 maquininhas + preview do PDV. */
export function TerminalShowcase({
  initial = 'cielo',
}: {
  initial?: TerminalMachine;
}) {
  const [machine, setMachine] = useState<TerminalMachine>(initial);

  return (
    <div className="term-showcase">
      <div
        className="term-picker"
        role="tablist"
        aria-label="Escolher maquininha"
      >
        {(Object.keys(TERMINAL_MACHINES) as TerminalMachine[]).map((id) => {
          const m = TERMINAL_MACHINES[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={machine === id}
              className={`term-picker-btn is-${id} ${machine === id ? 'is-on' : ''}`}
              onClick={() => setMachine(id)}
            >
              {m.short}
            </button>
          );
        })}
      </div>
      <MockPos machine={machine} glow />
      <p className="term-showcase-hint">
        O mesmo PDV Cashless nas 3: Cielo, Caixa (PagBank) e Laranjinha (Mercado
        Pago).
      </p>
    </div>
  );
}

export function LaptopShell({
  children,
  url = 'app.pdvcashless.com/dashboard',
}: {
  children: ReactNode;
  url?: string;
}) {
  return (
    <figure className="lap">
      <div className="lap-lid">
        <div className="lap-chrome">
          <span className="lap-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="lap-url">{url}</span>
        </div>
        <div className="lap-screen">{children}</div>
      </div>
      <div className="lap-base" aria-hidden>
        <div className="lap-notch" />
      </div>
    </figure>
  );
}

function StatusBar({ title }: { title: string }) {
  return (
    <div className="mock-statusbar" aria-hidden>
      <span>21:48</span>
      <strong>{title}</strong>
      <span className="mock-statusbar-right">
        <em>LTE</em>
        <em className="bat">84%</em>
      </span>
    </div>
  );
}

export function MockDashboard() {
  return (
    <LaptopShell>
      <div
        className="mock mock-dash"
        role="img"
        aria-label="Painel com vendas do dia, pulseiras ativas e produtos mais vendidos"
      >
        <div className="mock-dash-top">
          <div>
            <strong>PDV Cashless</strong>
            <span>Bar do Centro · Festival sexta</span>
          </div>
          <div className="mock-dash-actions">
            <span className="mock-pill">Ao vivo</span>
            <span className="mock-avatar">GC</span>
          </div>
        </div>
        <div className="mock-kpis">
          <div>
            <span>Vendas do dia</span>
            <b>{formatBRL(18420)}</b>
            <small className="up">+18% vs ontem</small>
          </div>
          <div>
            <span>Transações</span>
            <b>1.236</b>
            <small>média {formatBRL(14.9)}</small>
          </div>
          <div>
            <span>Pulseiras ativas</span>
            <b>412</b>
            <small>no evento</small>
          </div>
          <div>
            <span>Saldo circulando</span>
            <b>{formatBRL(3870)}</b>
            <small>nas pulseiras</small>
          </div>
        </div>
        <div className="mock-dash-split">
          <div className="mock-chart">
            <p>Produtos mais vendidos</p>
            <ul>
              {PRODUCTS.map((p) => (
                <li key={p.nome}>
                  <span>{p.nome}</span>
                  <div className="mock-bar-track">
                    <div
                      className="mock-bar-fill"
                      style={{ width: `${(p.valor / p.max) * 100}%` }}
                    />
                  </div>
                  <em>{formatBRL(p.valor)}</em>
                </li>
              ))}
            </ul>
          </div>
          <div className="mock-feed">
            <p>Últimas vendas</p>
            <ul>
              <li>
                <span>Chopp 300ml ×2</span>
                <em>{formatBRL(28)}</em>
              </li>
              <li>
                <span>Gin Tônica</span>
                <em>{formatBRL(28)}</em>
              </li>
              <li>
                <span>Cerveja Lata ×3</span>
                <em>{formatBRL(36)}</em>
              </li>
              <li>
                <span>Hambúrguer + Água</span>
                <em>{formatBRL(30)}</em>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </LaptopShell>
  );
}

type ScreenProps = {
  machine?: TerminalMachine;
  glow?: boolean;
};

export function MockCheckin({ machine = 'cielo', glow }: ScreenProps) {
  return (
    <TerminalShell
      machine={machine}
      glow={glow}
      nfcHint="Aproxime a pulseira"
      caption={TERMINAL_MACHINES[machine].short}
    >
      <div
        className="mock mock-term-ui mock-checkin"
        role="img"
        aria-label="Tela de check-in vinculando pulseira NFC ao cliente"
      >
        <StatusBar title="Check-in" />
        <div className="mock-checkin-card">
          <div className="mock-face" aria-hidden>
            AS
          </div>
          <p className="mock-label">Cliente</p>
          <p className="mock-value">Ana Souza</p>
          <p className="mock-label">CPF</p>
          <p className="mock-value">***.456.789-**</p>
          <p className="mock-label">Pulseira NFC</p>
          <p className="mock-uid">04A3 ··· 2233</p>
          <div className="mock-status ok">Vinculada · pronta para consumir</div>
          <button type="button" className="mock-btn" tabIndex={-1}>
            Liberar entrada
          </button>
        </div>
      </div>
    </TerminalShell>
  );
}

export function MockRecharge({ machine = 'laranjinha', glow }: ScreenProps) {
  return (
    <TerminalShell
      machine={machine}
      glow={glow}
      nfcHint="Pulseira lida"
      caption={TERMINAL_MACHINES[machine].short}
    >
      <div
        className="mock mock-term-ui mock-recarga"
        role="img"
        aria-label="Tela de recarga com pulseira lida, valor de cinquenta reais e PIX"
      >
        <StatusBar title="Recarga" />
        <div className="mock-recarga-body">
          <div className="mock-band-chip">
            <span className="mock-band-dot" />
            <div>
              <strong>Pulseira ativa</strong>
              <small>UID 04A3 ··· 2233</small>
            </div>
          </div>
          <label>
            Valor
            <div className="mock-input highlight">{formatBRL(50)}</div>
          </label>
          <div className="mock-chips">
            <span>{formatBRL(20)}</span>
            <span className="is-on">{formatBRL(50)}</span>
            <span>{formatBRL(100)}</span>
            <span>{formatBRL(200)}</span>
          </div>
          <div className="mock-pay-row">
            <span className="is-on">PIX</span>
            <span>Cartão</span>
            <span>Dinheiro</span>
          </div>
          <button type="button" className="mock-btn" tabIndex={-1}>
            Gerar cobrança de {formatBRL(50)}
          </button>
        </div>
      </div>
    </TerminalShell>
  );
}

export function MockPos({ machine = 'caixa', glow }: ScreenProps) {
  const total = CART.reduce((s, i) => s + i.qtd * i.preco, 0);
  const cats = [...new Set(POS_ITEMS.map((p) => p.cat))];
  const cervejas = POS_ITEMS.filter((p) => p.cat === 'Cervejas');
  const others = POS_ITEMS.filter((p) => p.cat !== 'Cervejas').slice(0, 4);

  return (
    <TerminalShell
      machine={machine}
      glow={glow}
      nfcHint="Aproxime p/ debitar"
      caption={TERMINAL_MACHINES[machine].short}
    >
      <div
        className="mock mock-term-ui mock-pos"
        role="img"
        aria-label={`PDV na ${TERMINAL_MACHINES[machine].label} com comanda de quarenta e sete reais`}
      >
        <StatusBar title="PDV" />
        <div className="mock-pos-top">
          <div>
            <strong>Bar do Centro</strong>
            <span>Pulseira 04A3 ··· 2233 · saldo {formatBRL(120)}</span>
          </div>
        </div>
        <div className="mock-cats">
          {cats.map((c, i) => (
            <span key={c} className={i === 0 ? 'is-on' : ''}>
              {c}
            </span>
          ))}
        </div>
        <div className="mock-grid">
          {[...cervejas, ...others].map((p) => (
            <div key={p.nome} className={`mock-prod tone-${p.tone}`}>
              <b>{p.nome}</b>
              <span>{formatBRL(p.preco)}</span>
            </div>
          ))}
        </div>
        <aside className="mock-pos-cart">
          <p>Comanda · 3 itens</p>
          <ul>
            {CART.map((i) => (
              <li key={i.nome}>
                <span>
                  {i.qtd}× {i.nome}
                </span>
                <em>{formatBRL(i.qtd * i.preco)}</em>
              </li>
            ))}
          </ul>
          <div className="mock-pos-total">
            <span>A pagar</span>
            <strong>{formatBRL(total)}</strong>
          </div>
          <button type="button" className="mock-btn" tabIndex={-1}>
            PAGAR · {formatBRL(total)}
          </button>
        </aside>
      </div>
    </TerminalShell>
  );
}
