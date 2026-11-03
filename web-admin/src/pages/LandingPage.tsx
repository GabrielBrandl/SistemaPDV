import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { formatBRL } from '../shared/format';
import type { PlanDefinition } from '../types/saas';

const STEPS = [
  {
    n: '01',
    title: 'Cadastro e pulseira',
    text: 'Cliente chega, faz check-in e vincula a pulseira NFC. Em segundos já está liberado para consumir.',
    img: '/marketing/dashboard.png',
    alt: 'Dashboard operacional do PDV Cashless',
  },
  {
    n: '02',
    title: 'Recarga na hora',
    text: 'PIX, cartão ou dinheiro com caixa aberto. O saldo cai na pulseira só depois do pagamento confirmado.',
    img: '/marketing/recarga.png',
    alt: 'Tela de recarga com valores e PIX',
  },
  {
    n: '03',
    title: 'Venda no terminal',
    text: 'Operador aproxima a pulseira na Cielo, Mercado Pago ou PagBank, escolhe o item e confirma. Sem fila de caixa.',
    img: '/marketing/pos.png',
    alt: 'Tela do PDV terminal com pulseira NFC',
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
      <Nav />
      <Hero />
      <ProductStrip />
      <HowItWorks />
      <Pricing />
      <LeadSection />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="lp-nav">
      <a href="#topo" className="lp-logo">
        PDV Cashless
      </a>
      <nav className="lp-nav-links" aria-label="Seções">
        <a href="#produto">Produto</a>
        <a href="#como">Como funciona</a>
        <a href="#precos">Preços</a>
        <a href="#contato">Demo</a>
        <Link to="/login" className="lp-nav-cta">
          Entrar
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section id="topo" className="lp-hero">
      <div className="lp-hero-bg" aria-hidden />
      <div className="lp-hero-inner">
        <p className="lp-logo lp-hero-brand">PDV Cashless</p>
        <h1>Cashless que sua equipe usa na maquininha.</h1>
        <p className="lp-hero-sub">
          Pulseira NFC, recarga segura e PDV nas Cielo, Mercado Pago e PagBank —
          do bar ao festival.
        </p>
        <div className="lp-actions">
          <a href="#contato" className="lp-btn lp-btn-main">
            Pedir demonstração
          </a>
          <a href="#precos" className="lp-btn lp-btn-soft">
            Ver preços
          </a>
        </div>
      </div>
      <div className="lp-hero-shot">
        <ScreenFrame label="PDV Terminal · Pulseira NFC">
          <img src="/marketing/pos.png" alt="Tela do PDV Cashless no terminal" />
        </ScreenFrame>
      </div>
    </section>
  );
}

function ScreenFrame({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <figure className="lp-frame">
      {label && <figcaption>{label}</figcaption>}
      <div className="lp-frame-screen">{children}</div>
    </figure>
  );
}

function ProductStrip() {
  return (
    <section id="produto" className="lp-section">
      <div className="lp-section-head">
        <p className="lp-kicker">Produto</p>
        <h2>Tudo que a operação precisa, em uma tela.</h2>
        <p className="lp-muted">
          Dashboard, terminal de venda e acesso do time — prints reais do
          sistema.
        </p>
      </div>
      <div className="lp-gallery">
        <ScreenFrame label="Dashboard do evento">
          <img
            src="/marketing/dashboard.png"
            alt="Dashboard com vendas, cartões e saldo"
          />
        </ScreenFrame>
        <ScreenFrame label="PDV na maquininha">
          <img src="/marketing/pos.png" alt="PDV terminal aguardando pulseira" />
        </ScreenFrame>
        <ScreenFrame label="Recarga da pulseira">
          <img src="/marketing/recarga.png" alt="Totem de recarga com PIX" />
        </ScreenFrame>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como" className="lp-section lp-section-tint">
      <div className="lp-section-head">
        <p className="lp-kicker">Como funciona</p>
        <h2>Três passos. Zero fricção no pico.</h2>
      </div>
      <div className="lp-steps">
        {STEPS.map((s) => (
          <article key={s.n} className="lp-step">
            <ScreenFrame>
              <img src={s.img} alt={s.alt} />
            </ScreenFrame>
            <div className="lp-step-copy">
              <span className="lp-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </article>
        ))}
      </div>
      <ul className="lp-chips" aria-label="Terminais compatíveis">
        <li>Cielo Smart</li>
        <li>Mercado Pago Point</li>
        <li>PagBank SmartPOS</li>
      </ul>
    </section>
  );
}

function Pricing() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans-landing'],
    queryFn: async () => (await api.get('/plans')).data as PlanDefinition[],
  });

  const list = (plans || []).filter((p) => p.id !== 'free');

  return (
    <section id="precos" className="lp-section">
      <div className="lp-section-head">
        <p className="lp-kicker">Preços</p>
        <h2>Planos claros, trial incluso.</h2>
        <p className="lp-muted">
          Escolha pelo tamanho da operação. Sem taxa escondida na vitrine.
        </p>
      </div>

      {isLoading ? (
        <p className="lp-muted">Carregando planos…</p>
      ) : (
        <div className="lp-pricing">
          {list.map((p) => (
            <article
              key={p.id}
              className={`lp-plan ${p.destaque ? 'is-featured' : ''}`}
            >
              {p.destaque && <span className="lp-plan-badge">Mais escolhido</span>}
              <h3>{p.nome}</h3>
              <p className="lp-plan-desc">{p.descricao}</p>
              <p className="lp-plan-price">
                {formatBRL(p.preco_mensal)}
                <span>/mês</span>
              </p>
              <p className="lp-plan-meta">
                ou {formatBRL(p.preco_anual)}/ano · {p.trial_dias} dias de trial
              </p>
              <ul>
                <li>
                  Até {p.limites.max_terminais} terminais
                </li>
                <li>Até {p.limites.max_eventos} eventos</li>
                <li>Até {p.limites.max_usuarios} usuários</li>
                {p.recursos.slice(0, 4).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <a
                href={`#contato`}
                className={`lp-btn ${p.destaque ? 'lp-btn-main' : 'lp-btn-soft'}`}
                onClick={() => {
                  sessionStorage.setItem('lp_plan', p.id);
                }}
              >
                Quero o {p.nome}
              </a>
            </article>
          ))}
        </div>
      )}
      <p className="lp-pricing-note">
        Já decidiu?{' '}
        <Link to="/onboard">Criar conta</Link> ou{' '}
        <Link to="/precos">ver comparação completa</Link>.
      </p>
    </section>
  );
}

function LeadSection() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [interesse, setInteresse] = useState('bar');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const plan = sessionStorage.getItem('lp_plan');
    if (plan) {
      setMensagem((m) => m || `Interesse no plano ${plan}.`);
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/leads', {
        nome,
        email,
        telefone,
        empresa: empresa || undefined,
        interesse,
        mensagem: mensagem || undefined,
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
    <section id="contato" className="lp-section lp-section-tint">
      <div className="lp-contact">
        <div>
          <p className="lp-kicker">Demonstração</p>
          <h2>Veja rodando no seu cenário.</h2>
          <p className="lp-muted">
            Conta quantas maquininhas e se é bar fixo ou evento. Retornamos com
            demo e proposta.
          </p>
        </div>

        {done ? (
          <div className="lp-form lp-form-ok" role="status">
            <h3>Pedido recebido</h3>
            <p>Em breve falamos no WhatsApp ou e-mail que você passou.</p>
          </div>
        ) : (
          <form className="lp-form" onSubmit={onSubmit}>
            <label>
              Nome
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              E-mail
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              WhatsApp
              <input
                required
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                autoComplete="tel"
                placeholder="11 99999-9999"
              />
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
            <label className="lp-span-2">
              Detalhes
              <textarea
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex.: 8 maquininhas PagBank, festa no mês que vem…"
              />
            </label>
            {error && <p className="lp-error lp-span-2">{error}</p>}
            <button
              type="submit"
              className="lp-btn lp-btn-main lp-span-2"
              disabled={loading}
            >
              {loading ? 'Enviando…' : 'Quero uma demo'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <span className="lp-logo">PDV Cashless</span>
      <div>
        <Link to="/login">Entrar</Link>
        <Link to="/precos">Planos</Link>
        <a href="mailto:contato@pyrou.com.br">contato@pyrou.com.br</a>
      </div>
    </footer>
  );
}
