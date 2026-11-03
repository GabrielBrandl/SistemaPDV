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
    title: 'Pulseira na entrada',
    text: 'Check-in rápido e vínculo NFC. O cliente já entra com saldo ou abre o consumo no modo do evento.',
    img: '/marketing/dashboard.png',
    alt: 'Dashboard do evento no PDV Cashless',
  },
  {
    n: '02',
    title: 'Recarga sem fila',
    text: 'PIX, cartão ou dinheiro. O crédito só cai depois do pagamento aprovado — com caixa e auditoria.',
    img: '/marketing/recarga.png',
    alt: 'Tela de recarga de pulseira',
  },
  {
    n: '03',
    title: 'Venda na maquininha',
    text: 'Aproxima a pulseira, escolhe o item, confirma. Cielo, Mercado Pago ou PagBank no mesmo fluxo.',
    img: '/marketing/pos.png',
    alt: 'PDV terminal com pulseira NFC',
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
      <Hero />
      <ProductStrip />
      <HowItWorks />
      <Pricing />
      <LeadSection />
      <Footer />
    </div>
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

      <div className="lp-hero-top">
        <p className="lp-wordmark">PDV Cashless</p>
        <div className="lp-hero-top-actions">
          <a href="#precos">Preços</a>
          <Link to="/login">Entrar</Link>
        </div>
      </div>

      <div className="lp-hero-stage">
        <div className="lp-hero-copy">
          <h1>O bar vende. A pulseira paga.</h1>
          <p className="lp-hero-sub">
            Cashless para bares e eventos: NFC, recarga e PDV nas maquininhas —
            sem fricção no pico.
          </p>
          <div className="lp-actions">
            <a href="#contato" className="lp-btn lp-btn-amber">
              Pedir demonstração
            </a>
            <a href="#como" className="lp-btn lp-btn-ghost">
              Ver como funciona
            </a>
          </div>
        </div>

        <div className="lp-hero-device">
          <ScreenFrame glow>
            <img
              src="/marketing/pos.png"
              alt="PDV Cashless no terminal com pulseira NFC"
            />
          </ScreenFrame>
        </div>
      </div>
    </section>
  );
}

function ScreenFrame({
  children,
  glow = false,
  caption,
}: {
  children: ReactNode;
  glow?: boolean;
  caption?: string;
}) {
  return (
    <figure className={`lp-device ${glow ? 'is-glow' : ''}`}>
      {caption ? <figcaption>{caption}</figcaption> : null}
      <div className="lp-device-bezel">{children}</div>
    </figure>
  );
}

function ProductStrip() {
  return (
    <section id="produto" className="lp-band">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Nas telas</p>
        <h2>Feito para a operação real.</h2>
        <p className="lp-lede">
          Prints do sistema em produção — dashboard, recarga e PDV na
          maquininha.
        </p>

        <div className="lp-shot-rail">
          <ScreenFrame caption="Dashboard">
            <img
              src="/marketing/dashboard.png"
              alt="Dashboard com vendas e saldo circulando"
            />
          </ScreenFrame>
          <ScreenFrame caption="Recarga">
            <img
              src="/marketing/recarga.png"
              alt="Recarga com valores rápidos e PIX"
            />
          </ScreenFrame>
          <ScreenFrame caption="PDV Terminal">
            <img
              src="/marketing/pos.png"
              alt="Terminal aguardando pulseira NFC"
            />
          </ScreenFrame>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
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
          {STEPS.map((step, i) => (
            <article key={step.n} className="lp-flow-item">
              <ScreenFrame>
                <img src={step.img} alt={step.alt} />
              </ScreenFrame>
              <div className="lp-flow-copy">
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {i === 2 && (
                  <p className="lp-terminals">
                    Cielo Smart · Mercado Pago Point · PagBank
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
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
    <section id="precos" className="lp-band">
      <div className="lp-band-inner">
        <p className="lp-eyebrow">Planos</p>
        <h2>Preço transparente.</h2>
        <p className="lp-lede">
          Trial incluso. Escala por terminais, eventos e usuários.
        </p>

        {isLoading ? (
          <p className="lp-lede">Carregando…</p>
        ) : (
          <div className="lp-price-grid">
            {list.map((p) => (
              <article
                key={p.id}
                className={`lp-price-card ${p.destaque ? 'is-hot' : ''}`}
              >
                {p.destaque ? <span className="lp-hot">Recomendado</span> : null}
                <h3>{p.nome}</h3>
                <p className="lp-price-desc">{p.descricao}</p>
                <p className="lp-price-value">
                  {formatBRL(p.preco_mensal)}
                  <small>/mês</small>
                </p>
                <p className="lp-price-year">
                  {formatBRL(p.preco_anual)} no anual · {p.trial_dias} dias trial
                </p>
                <ul>
                  <li>{p.limites.max_terminais} terminais</li>
                  <li>{p.limites.max_eventos} eventos</li>
                  <li>{p.limites.max_usuarios} usuários</li>
                  {p.recursos.slice(0, 3).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <a
                  href="#contato"
                  className={`lp-btn ${p.destaque ? 'lp-btn-amber' : 'lp-btn-ghost'}`}
                  onClick={() => sessionStorage.setItem('lp_plan', p.nome)}
                >
                  Quero o {p.nome}
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
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
    if (plan) setMensagem((m) => m || `Quero o plano ${plan}.`);
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
    <section id="contato" className="lp-band lp-band-deep">
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
            <h3>Recebido.</h3>
            <p>Em breve falamos no WhatsApp ou e-mail.</p>
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
            <label className="lp-span">
              Detalhes
              <textarea
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </label>
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
      <p className="lp-wordmark">PDV Cashless</p>
      <div>
        <Link to="/login">Entrar</Link>
        <Link to="/onboard">Criar conta</Link>
        <a href="mailto:contato@pyrou.com.br">contato@pyrou.com.br</a>
      </div>
    </footer>
  );
}
