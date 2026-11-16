import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { formatBRL } from '../shared/format';
import type { PlanDefinition } from '../types/saas';
import {
  MockCheckin,
  MockDashboard,
  MockPos,
  MockRecharge,
  TerminalShowcase,
} from '../components/landing/MockScreens';
import { CookieConsent } from '../components/CookieConsent';

const CONTACT_EMAIL = 'contato@pyrou.com.br';
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'Quero conhecer o PDV Cashless',
)}`;
/** WhatsApp comercial — atualize o DDI+número quando disponível */
const WHATSAPP_NUMBER = '5511999999999';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Quero conhecer o PDV Cashless',
)}`;
const HAS_WHATSAPP = false;

const PLAN_DISPLAY: Record<
  string,
  { limites: string[]; recursos: string[] }
> = {
  starter: {
    limites: ['Até 5 terminais', 'Até 5 eventos', 'Até 10 usuários'],
    recursos: [
      'PDV comanda NFC',
      'Controle de saída',
      'Cadastro e check-in',
      'PIX + SoftPOS',
    ],
  },
  pro: {
    limites: ['Até 25 terminais', 'Até 30 eventos', 'Até 50 usuários'],
    recursos: [
      'Tudo do Starter',
      'Emissão de nota fiscal (NFC-e)',
      'Integrações (webhooks/API)',
      'Dashboard em tempo real',
    ],
  },
  enterprise: {
    limites: [
      'Terminais ilimitados',
      'Eventos ilimitados',
      'Usuários sob medida',
    ],
    recursos: [
      'Tudo do Pro',
      'SLA e gerente de conta',
      'Onboarding assistido',
      'Ambiente dedicado (opcional)',
    ],
  },
};

const FAQ_ITEMS = [
  {
    q: 'Funciona sem internet?',
    a: 'O PDV nas maquininhas precisa de conexão para autorizar pagamentos e sincronizar saldos. Em instabilidades curtas, a operação segue as regras do adquirente; recomendamos link estável (4G/Wi‑Fi dedicado) no evento.',
  },
  {
    q: 'O que acontece com o saldo que sobra na pulseira?',
    a: 'Você define a política do evento: estorno parcial, crédito para o próximo dia ou consumo até zerar. O painel registra cada movimento para auditoria e atendimento ao cliente.',
  },
  {
    q: 'Tem taxa por transação?',
    a: 'A assinatura do PDV Cashless é mensal/anual conforme o plano. Taxas de cartão/PIX seguem o contrato do seu adquirente (Cielo, PagBank, Mercado Pago etc.). Não cobramos % extra sobre o volume por padrão.',
  },
  {
    q: 'Preciso comprar as pulseiras e as maquininhas?',
    a: 'As maquininhas são as que você já opera ou aluga com o adquirente. Pulseiras/comandas NFC podem ser fornecidas por parceiros (ex.: bríndes personalizados) ou pelo seu fornecedor habitual — ajudamos no especificação do chip.',
  },
  {
    q: 'Quanto tempo leva para implantar?',
    a: 'Um bar enxuto sobe em poucos dias (cadastro, produtos, terminais e treino rápido). Festivais maiores entram em cronograma com checklist de rede, equipe e homologação na loja do adquirente.',
  },
  {
    q: 'Emite nota fiscal (NFC-e)?',
    a: 'Sim, no plano Pro em diante, com integração Focus NFe em produção (após configuração fiscal do CNPJ do estabelecimento). No trial a emissão pode rodar em homologação.',
  },
];

export function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const getHomePath = useAuthStore((s) => s.getHomePath);

  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => document.documentElement.classList.remove('landing-active');
  }, []);

  if (token) {
    return <Navigate to={getHomePath()} replace />;
  }

  return (
    <div className="lp">
      <Header />
      <Hero />
      <RealtimePanel />
      <HowItWorks />
      <WhySwitch />
      <SocialProof />
      <Pricing />
      <Faq />
      <LeadSection />
      <Footer />
      {HAS_WHATSAPP ? <WhatsAppFab /> : null}
      <CookieConsent />
    </div>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`lp-nav ${scrolled || open ? 'is-solid' : ''}`}>
      <a href="#topo" className="lp-wordmark" onClick={close}>
        PDV Cashless
      </a>
      <nav className="lp-nav-desktop" aria-label="Principal">
        <a href="#como">Como funciona</a>
        <a href="#precos">Preços</a>
        <a href="#faq">FAQ</a>
        <Link to="/login" className="lp-nav-text">
          Entrar
        </Link>
        <Link to="/onboard" className="lp-btn lp-btn-amber lp-btn-sm">
          Teste grátis
        </Link>
      </nav>
      <button
        type="button"
        className="lp-burger"
        aria-expanded={open}
        aria-controls="lp-mobile-menu"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      {open ? (
        <nav id="lp-mobile-menu" className="lp-nav-mobile" aria-label="Mobile">
          <a href="#como" onClick={close}>
            Como funciona
          </a>
          <a href="#precos" onClick={close}>
            Preços
          </a>
          <a href="#faq" onClick={close}>
            FAQ
          </a>
          <Link to="/login" onClick={close}>
            Entrar
          </Link>
          <Link
            to="/onboard"
            className="lp-btn lp-btn-amber"
            onClick={close}
          >
            Teste grátis
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

function Hero() {
  return (
    <section id="topo" className="lp-hero">
      <div
        className="lp-hero-atmosphere"
        style={{ backgroundImage: "url('/marketing/atmosphere.jpg')" }}
        aria-hidden
      />
      <div className="lp-hero-veil" aria-hidden />

      <div className="lp-hero-stage">
        <div className="lp-hero-copy">
          <p className="lp-wordmark lp-hero-brand">PDV Cashless</p>
          <h1>O bar vende. A pulseira paga.</h1>
          <p className="lp-hero-sub">
            Cashless para bares e eventos: NFC, recarga e PDV nas maquininhas —
            sem fricção no pico.
          </p>
          <div className="lp-actions">
            <Link to="/onboard" className="lp-btn lp-btn-amber">
              Teste grátis
            </Link>
            <a href="#como" className="lp-btn lp-btn-ghost">
              Ver como funciona
            </a>
          </div>
          <p className="lp-trust">
            14 dias grátis · sem cartão de crédito
            <span>Cielo · Caixa · Laranjinha</span>
          </p>
        </div>

        <div className="lp-hero-device">
          <TerminalShowcase initial="cielo" />
        </div>
      </div>
    </section>
  );
}

function RealtimePanel() {
  return (
    <section id="produto" className="lp-band">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Painel em tempo real</p>
        <h2>Veja a casa inteira em um lugar.</h2>
        <p className="lp-lede">
          Vendas, pulseiras ativas e ranking de produtos — com números de
          demonstração realistas.
        </p>
        <div className="lp-dash-wide">
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Pulseira na entrada',
      text: 'Check-in rápido e vínculo NFC. O cliente já entra com saldo ou abre o consumo no modo do evento.',
      visual: <MockCheckin machine="cielo" />,
    },
    {
      n: '02',
      title: 'Recarga sem fila',
      text: 'PIX, cartão ou dinheiro. O crédito só cai depois do pagamento aprovado — com caixa e auditoria.',
      visual: <MockRecharge machine="laranjinha" />,
    },
    {
      n: '03',
      title: 'Venda na maquininha',
      text: 'Aproxima a pulseira, escolhe o item, confirma. Cielo, Caixa (PagBank) ou Laranjinha no mesmo fluxo.',
      visual: <MockPos machine="caixa" />,
    },
  ];

  return (
    <section id="como" className="lp-band lp-band-deep">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Fluxo</p>
        <h2>Como funciona</h2>
        <p className="lp-lede">
          Da porta ao copo, em três momentos. Seu time não inventa processo no
          meio do show.
        </p>
        <div className="lp-flow">
          {steps.map((step, i) => (
            <article key={step.n} className="lp-flow-item">
              <div className="lp-flow-visual">{step.visual}</div>
              <div className="lp-flow-copy">
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {i === 2 ? (
                  <p className="lp-terminals">
                    Cielo Smart · Mercado Pago Point · PagBank
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhySwitch() {
  const items = [
    {
      t: 'Fila menor no bar',
      d: 'Pedido e pagamento na pulseira — sem troca de dinheiro no balcão.',
    },
    {
      t: 'Fim do furo de caixa',
      d: 'Saldo digital com auditoria. Cada movimento fica registrado.',
    },
    {
      t: 'Saldo residual vira receita',
      d: 'O que sobra na pulseira pode virar política clara de residual.',
    },
    {
      t: 'Relatório ao vivo',
      d: 'Produto, terminal e horário — visão operacional em tempo real.',
    },
  ];

  return (
    <section className="lp-band">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Por que trocar</p>
        <h2>Por que trocar a ficha de papel</h2>
        <div className="lp-benefit-grid">
          {items.map((item) => (
            <article key={item.t} className="lp-benefit">
              <h3>{item.t}</h3>
              <p>{item.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="lp-band lp-band-deep">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Prova social</p>
        <h2>Quem já opera com a gente</h2>
        <div className="lp-logos" aria-label="Logos de clientes">
          <span>[LOGO CLIENTE 1]</span>
          <span>[LOGO CLIENTE 2]</span>
          <span>[LOGO CLIENTE 3]</span>
          <span>[LOGO CLIENTE 4]</span>
        </div>
        <div className="lp-quotes">
          <blockquote>
            <p>[DEPOIMENTO]</p>
            <footer>
              <strong>[NOME]</strong>
              <span>[CARGO] · [LOCAL]</span>
            </footer>
          </blockquote>
          <blockquote>
            <p>[DEPOIMENTO]</p>
            <footer>
              <strong>[NOME]</strong>
              <span>[CARGO] · [LOCAL]</span>
            </footer>
          </blockquote>
        </div>
        <p className="lp-stat">
          <strong>[NÚMERO DESTAQUE]</strong>
          <span>[DESCRIÇÃO DO NÚMERO]</span>
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans-landing'],
    queryFn: async () => (await api.get('/plans')).data as PlanDefinition[],
  });
  const list = (plans || []).filter((p) => p.id !== 'free');

  return (
    <section id="precos" className="lp-band">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Planos</p>
        <h2>Preço transparente.</h2>
        <p className="lp-lede">
          Trial incluso. Escolha mensal ou anual (2 meses grátis).
        </p>

        <div className="lp-billing-toggle" role="group" aria-label="Ciclo">
          <button
            type="button"
            className={!annual ? 'is-on' : ''}
            onClick={() => setAnnual(false)}
          >
            Mensal
          </button>
          <button
            type="button"
            className={annual ? 'is-on' : ''}
            onClick={() => setAnnual(true)}
          >
            Anual
            <em>2 meses grátis</em>
          </button>
        </div>

        {isLoading ? (
          <p className="lp-lede">Carregando…</p>
        ) : (
          <div className="lp-price-grid">
            {list.map((p) => {
              const display = PLAN_DISPLAY[p.id] ?? {
                limites: [],
                recursos: p.recursos.slice(0, 4),
              };
              const monthlyEq = annual
                ? Number(p.preco_anual) / 12
                : Number(p.preco_mensal);
              const cta =
                p.id === 'enterprise' ? (
                  <a href="#contato" className="lp-btn lp-btn-ghost">
                    Falar com vendas
                  </a>
                ) : (
                  <Link
                    to={`/onboard?plano=${p.id}`}
                    className={`lp-btn ${p.destaque ? 'lp-btn-amber' : 'lp-btn-ghost'}`}
                  >
                    Começar teste grátis
                  </Link>
                );

              return (
                <article
                  key={p.id}
                  className={`lp-price-card ${p.destaque ? 'is-hot' : ''}`}
                >
                  {p.destaque ? (
                    <span className="lp-hot">Recomendado</span>
                  ) : null}
                  {annual ? <span className="lp-save">2 meses grátis</span> : null}
                  <h3>{p.nome}</h3>
                  <p className="lp-price-desc">{p.descricao}</p>
                  <p className="lp-price-value">
                    {formatBRL(monthlyEq)}
                    <small>/mês</small>
                  </p>
                  <p className="lp-price-year">
                    {annual
                      ? `${formatBRL(p.preco_anual)} cobrados no ano · ${p.trial_dias} dias trial`
                      : `${formatBRL(p.preco_anual)} no anual · ${p.trial_dias} dias trial`}
                  </p>
                  <ul>
                    {display.limites.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    {display.recursos.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {cta}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Faq() {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="lp-band lp-band-deep">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">FAQ</p>
        <h2>Perguntas frequentes</h2>
        <div className="lp-faq">
          {FAQ_ITEMS.map((item, i) => {
            const panelId = `${baseId}-panel-${i}`;
            const btnId = `${baseId}-btn-${i}`;
            const isOpen = open === i;
            return (
              <div key={item.q} className="lp-faq-item">
                <h3>
                  <button
                    type="button"
                    id={btnId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {item.q}
                    <span aria-hidden>{isOpen ? '−' : '+'}</span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!isOpen}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function maskPhoneBR(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function LeadSection() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [interesse, setInteresse] = useState('bar');
  const [maquinas, setMaquinas] = useState('1-5');
  const [mensagem, setMensagem] = useState('');
  const [lgpd, setLgpd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    const plan = sessionStorage.getItem('lp_plan');
    if (plan) setMensagem((m) => m || `Quero o plano ${plan}.`);
  }, []);

  function validate() {
    const errs: Record<string, string> = {};
    if (nome.trim().length < 2) errs.nome = 'Informe seu nome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
    if (telefone.replace(/\D/g, '').length < 10)
      errs.telefone = 'WhatsApp incompleto';
    if (!lgpd) errs.lgpd = 'É preciso aceitar a política de privacidade';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/leads', {
        nome,
        email,
        telefone: telefone.replace(/\D/g, ''),
        empresa: empresa || undefined,
        interesse,
        mensagem:
          `${mensagem ? `${mensagem}\n` : ''}Maquininhas: ${maquinas}`.trim() ||
          undefined,
        origem: 'landing',
      });
      setDone(true);
      sessionStorage.removeItem('lp_plan');
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível enviar. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contato" className="lp-band">
      <div className="lp-band-inner lp-contact">
        <div>
          <p className="lp-eyebrow">Demo</p>
          <h2>Vamos rodar no seu cenário.</h2>
          <p className="lp-lede">
            Quantas maquininhas? Bar fixo ou festival? Respondemos com demo e
            proposta.
          </p>
        </div>

        {done ? (
          <div className="lp-form is-ok" role="status">
            <h3>Recebemos! Respondemos em até 1 dia útil.</h3>
            <p>Se preferir, fale agora por e-mail.</p>
            <a className="lp-btn lp-btn-amber" href={CONTACT_MAILTO}>
              Falar por e-mail
            </a>
          </div>
        ) : (
          <form className="lp-form" onSubmit={onSubmit} noValidate>
            <label>
              Nome *
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                aria-invalid={!!fieldErrors.nome}
              />
              {fieldErrors.nome ? (
                <span className="lp-field-error">{fieldErrors.nome}</span>
              ) : null}
            </label>
            <label>
              E-mail *
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email ? (
                <span className="lp-field-error">{fieldErrors.email}</span>
              ) : null}
            </label>
            <label>
              WhatsApp *
              <input
                required
                type="tel"
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                aria-invalid={!!fieldErrors.telefone}
              />
              {fieldErrors.telefone ? (
                <span className="lp-field-error">{fieldErrors.telefone}</span>
              ) : null}
            </label>
            <label>
              Empresa / evento
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                autoComplete="organization"
              />
            </label>
            <label>
              Tipo
              <select
                value={interesse}
                onChange={(e) => setInteresse(e.target.value)}
              >
                <option value="bar">Bar / casa</option>
                <option value="evento">Festival / evento</option>
                <option value="rede">Rede</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label>
              Nº de maquininhas
              <select
                value={maquinas}
                onChange={(e) => setMaquinas(e.target.value)}
              >
                <option value="1-5">1–5</option>
                <option value="6-15">6–15</option>
                <option value="16-30">16–30</option>
                <option value="30+">30+</option>
              </select>
            </label>
            <label className="lp-span">
              Detalhes
              <textarea
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </label>
            <label className="lp-check lp-span">
              <input
                type="checkbox"
                checked={lgpd}
                onChange={(e) => setLgpd(e.target.checked)}
              />
              <span>
                Concordo com a{' '}
                <Link to="/privacidade">Política de Privacidade</Link>
              </span>
            </label>
            {fieldErrors.lgpd ? (
              <p className="lp-field-error lp-span">{fieldErrors.lgpd}</p>
            ) : null}
            {error ? <p className="lp-error lp-span">{error}</p> : null}
            <button
              type="submit"
              className="lp-btn lp-btn-amber lp-span"
              disabled={loading}
            >
              {loading ? 'Enviando…' : 'Pedir demonstração'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-foot-grid">
        <div>
          <p className="lp-wordmark">PDV Cashless</p>
          <p className="lp-foot-tag">
            Cashless para bares e eventos — pulseira NFC e PDV nas maquininhas.
          </p>
        </div>
        <div>
          <p className="lp-foot-title">Produto</p>
          <a href="#como">Como funciona</a>
          <a href="#precos">Preços</a>
          <a href="#faq">FAQ</a>
          <Link to="/login">Entrar</Link>
          <Link to="/onboard">Criar conta</Link>
        </div>
        <div>
          <p className="lp-foot-title">Contato</p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <a href={`mailto:privacidade@pyrou.com.br`}>
            Privacidade / DPO
          </a>
          {HAS_WHATSAPP ? (
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
      <div className="lp-foot-legal">
        <span>© 2026 PDV Cashless · Pyrou Tecnologia</span>
        <span>
          <Link to="/termos">Termos de Uso</Link>
          {' · '}
          <Link to="/privacidade">Política de Privacidade</Link>
        </span>
      </div>
    </footer>
  );
}

function WhatsAppFab() {
  return (
    <a
      className="lp-wa"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
    >
      WhatsApp
    </a>
  );
}
