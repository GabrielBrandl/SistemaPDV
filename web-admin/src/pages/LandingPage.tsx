import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';

const HERO_IMG =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=2400&q=80';

export function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const getHomePath = useAuthStore((s) => s.getHomePath);

  if (token) {
    return <Navigate to={getHomePath()} replace />;
  }

  return (
    <div className="landing-root">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <Terminals />
      <LeadSection />
      <PricingTeaser />
      <LandingFooter />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="landing-nav">
      <a href="#topo" className="landing-brand-mark">
        PDV Cashless
      </a>
      <div className="landing-nav-links">
        <a href="#como">Como funciona</a>
        <a href="#maquininhas">Maquininhas</a>
        <a href="#contato">Contato</a>
        <Link to="/precos">Planos</Link>
        <Link to="/login" className="landing-nav-login">
          Entrar
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="topo" className="landing-hero">
      <div className="landing-hero-copy">
        <p className="landing-brand">PDV Cashless</p>
        <h1>Venda no pulso. Sem fila no caixa.</h1>
        <p className="landing-hero-sub">
          Pulseira NFC, recarga e PDV nas maquininhas Cielo, Mercado Pago e
          PagBank — feito para bares e eventos.
        </p>
        <div className="landing-cta-row">
          <a href="#contato" className="landing-btn-primary">
            Quero uma demonstração
          </a>
          <Link to="/precos" className="landing-btn-ghost">
            Ver planos
          </Link>
        </div>
      </div>
      <div className="landing-hero-visual" aria-hidden>
        <img src={HERO_IMG} alt="" className="landing-hero-img" />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como" className="landing-section">
      <p className="landing-kicker">Operação</p>
      <h2>Do check-in à saída, um fluxo só.</h2>
      <p className="landing-lead">
        Cliente coloca saldo na pulseira, consome no bar e libera a saída com
        conferência automática — sem papel e sem surpresa no fechamento.
      </p>
      <ol className="landing-steps">
        <li>
          <span>01</span>
          Cadastro e vínculo da pulseira NFC
        </li>
        <li>
          <span>02</span>
          Recarga PIX, cartão ou dinheiro com caixa aberto
        </li>
        <li>
          <span>03</span>
          Venda no PDV da maquininha e controle de saída
        </li>
      </ol>
    </section>
  );
}

function Terminals() {
  return (
    <section id="maquininhas" className="landing-section landing-section-alt">
      <p className="landing-kicker">SmartPOS</p>
      <h2>Roda onde você já recebe.</h2>
      <p className="landing-lead">
        App nativo para Cielo Smart, Mercado Pago Point e PagBank — o operador
        não troca de ferramenta no meio do pico.
      </p>
      <ul className="landing-terminals">
        <li>Cielo Smart · deep link Lio</li>
        <li>Mercado Pago Point · SoftPOS</li>
        <li>PagBank SmartPOS · PlugPag</li>
      </ul>
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
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível enviar. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contato" className="landing-section landing-contact">
      <div className="landing-contact-intro">
        <p className="landing-kicker">Comercial</p>
        <h2>Fale com a gente.</h2>
        <p className="landing-lead">
          Conta o tamanho da operação. Retornamos com demo, prazos e o plano
          certo — sem compromisso.
        </p>
      </div>

      {done ? (
        <div className="landing-form landing-form-success" role="status">
          <h3>Recebemos seu contato</h3>
          <p>
            Em breve alguém da equipe escreve no e-mail ou WhatsApp que você
            informou.
          </p>
          <a href="#topo" className="landing-btn-ghost">
            Voltar ao topo
          </a>
        </div>
      ) : (
        <form className="landing-form" onSubmit={onSubmit}>
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
              placeholder="11999999999"
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
            Interesse
            <select
              value={interesse}
              onChange={(e) => setInteresse(e.target.value)}
            >
              <option value="bar">Bar / casa noturna</option>
              <option value="evento">Festival / evento</option>
              <option value="rede">Rede de unidades</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="landing-form-full">
            Mensagem
            <textarea
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Quantas maquininhas, datas, volume estimado…"
            />
          </label>
          {error && <p className="landing-form-error">{error}</p>}
          <button
            type="submit"
            className="landing-btn-primary landing-form-full"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Pedir demonstração'}
          </button>
        </form>
      )}
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="landing-section landing-pricing">
      <p className="landing-kicker">Planos</p>
      <h2>Do bar fixo ao festival.</h2>
      <p className="landing-lead">
        Starter, Pro e Enterprise com trial. Escolha o teto de terminais e
        eventos — e comece a vender cashless.
      </p>
      <div className="landing-cta-row">
        <Link to="/precos" className="landing-btn-primary">
          Comparar planos
        </Link>
        <Link to="/onboard" className="landing-btn-ghost">
          Criar conta
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => document.documentElement.classList.remove('landing-active');
  }, []);

  return (
    <footer className="landing-footer">
      <span className="landing-brand-mark">PDV Cashless</span>
      <div className="landing-footer-links">
        <Link to="/login">Entrar</Link>
        <Link to="/precos">Planos</Link>
        <a href="mailto:contato@pyrou.com.br">contato@pyrou.com.br</a>
      </div>
    </footer>
  );
}
