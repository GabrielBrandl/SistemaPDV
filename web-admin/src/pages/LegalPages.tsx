import { Link } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { CookieConsent } from '../components/CookieConsent';

const UPDATED_AT = '15 de novembro de 2026';
const CONTROLLER = 'Pyrou Tecnologia (PDV Cashless)';
const EMAIL = 'contato@pyrou.com.br';
const DPO_EMAIL = 'privacidade@pyrou.com.br';

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    document.title = `${title} · PDV Cashless`;
    return () => document.documentElement.classList.remove('landing-active');
  }, [title]);

  return (
    <div className="lp lp-legal">
      <header className="lp-nav is-solid">
        <Link to="/" className="lp-wordmark">
          PDV Cashless
        </Link>
        <Link to="/" className="lp-nav-text">
          Voltar
        </Link>
      </header>
      <main className="lp-band-inner lp-legal-main">
        <p className="lp-eyebrow">Documento legal</p>
        <h1>{title}</h1>
        <p className="lp-legal-meta">Última atualização: {UPDATED_AT}</p>
        {children}
      </main>
      <CookieConsent />
    </div>
  );
}

export function TermosPage() {
  return (
    <LegalShell title="Termos de Uso">
      <section>
        <h2>1. Aceitação</h2>
        <p>
          Ao acessar o site e/ou utilizar a plataforma PDV Cashless, você
          concorda com estes Termos de Uso e com a{' '}
          <Link to="/privacidade">Política de Privacidade</Link>. Se não
          concordar, não utilize os serviços.
        </p>
      </section>

      <section>
        <h2>2. O serviço</h2>
        <p>
          O PDV Cashless é uma solução de gestão cashless para bares, casas e
          eventos, incluindo comanda/pulseira NFC, recarga, PDV em maquininhas
          smart (ex.: Cielo, PagBank, Mercado Pago), painel web e recursos
          correlatos descritos no site e nos planos contratados.
        </p>
        <p>
          Demonstrações, trials e ambientes de teste podem conter dados
          fictícios e funcionalidades limitadas.
        </p>
      </section>

      <section>
        <h2>3. Cadastro e conta</h2>
        <p>
          Você é responsável por informações verdadeiras no cadastro, pela
          confidencialidade das credenciais e por toda atividade realizada sob
          sua conta. Notifique-nos imediatamente em caso de uso não autorizado
          pelo e-mail {EMAIL}.
        </p>
      </section>

      <section>
        <h2>4. Planos, trial e pagamento</h2>
        <p>
          Valores, limites e períodos de trial são os divulgados na página de
          preços ou em proposta comercial. O trial não exige cartão, salvo
          indicação em contrário. Após o trial, a continuidade depende de
          contratação ativa.
        </p>
      </section>

      <section>
        <h2>5. Uso aceitável</h2>
        <p>É vedado:</p>
        <ul>
          <li>usar o serviço para fins ilícitos ou em desacordo com a legislação;</li>
          <li>tentar obter acesso não autorizado a sistemas, dados ou contas;</li>
          <li>interferir na disponibilidade, segurança ou integridade da plataforma;</li>
          <li>revender o serviço sem autorização contratual.</li>
        </ul>
      </section>

      <section>
        <h2>6. Propriedade intelectual</h2>
        <p>
          Marcas, software, layouts, textos e materiais do PDV Cashless
          pertencem a {CONTROLLER} ou a licenciantes. O uso do serviço não
          transfere direitos de propriedade intelectual.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidade e suporte</h2>
        <p>
          Buscamos alta disponibilidade, mas não garantimos operação
          ininterrupta. Manutenções, falhas de rede, de adquirentes ou de
          terceiros podem afetar o serviço. O suporte comercial responde pelo
          e-mail {EMAIL}.
        </p>
      </section>

      <section>
        <h2>8. Limitação de responsabilidade</h2>
        <p>
          Na máxima extensão permitida pela lei, {CONTROLLER} não se
          responsabiliza por lucros cessantes, danos indiretos ou prejuízos
          decorrentes de uso inadequado, configuração incorreta do
          estabelecimento, indisponibilidade de terceiros (adquirentes, PIX,
          internet) ou força maior.
        </p>
      </section>

      <section>
        <h2>9. Privacidade</h2>
        <p>
          O tratamento de dados pessoais segue a{' '}
          <Link to="/privacidade">Política de Privacidade</Link> e a LGPD (Lei
          nº 13.709/2018).
        </p>
      </section>

      <section>
        <h2>10. Alterações e foro</h2>
        <p>
          Podemos atualizar estes Termos a qualquer momento, com publicação
          nesta página. O foro da comarca do domicílio do usuário no Brasil é
          competente para dirimir controvérsias, ressalvadas disposições
          legais de proteção ao consumidor.
        </p>
        <p>
          Dúvidas: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
      </section>
    </LegalShell>
  );
}

export function PrivacidadePage() {
  return (
    <LegalShell title="Política de Privacidade">
      <section>
        <h2>1. Quem somos (controlador)</h2>
        <p>
          O controlador dos dados pessoais tratados neste site e na plataforma
          PDV Cashless é <strong>{CONTROLLER}</strong>. Contato:{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Encarregado (DPO):{' '}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Quais dados coletamos</h2>
        <ul>
          <li>
            <strong>Formulário de demonstração / leads:</strong> nome, e-mail,
            telefone/WhatsApp, empresa ou evento, tipo de interesse, número
            aproximado de maquininhas e mensagem.
          </li>
          <li>
            <strong>Conta e operação:</strong> dados de cadastro, usuários da
            equipe, registros de uso do PDV, recargas, vendas e auditoria
            necessários à prestação do serviço contratado.
          </li>
          <li>
            <strong>Navegação:</strong> dados técnicos como IP, data/hora,
            páginas visitadas e cookies essenciais/analíticos (conforme
            preferências do banner de cookies).
          </li>
        </ul>
        <p>
          Não solicitamos dados sensíveis no formulário de leads. Dados de
          clientes finais do estabelecimento (ex.: vínculo de pulseira) são
          tratados no contexto do contrato com o estabelecimento, que atua
          como controlador desses dados operacionais.
        </p>
      </section>

      <section>
        <h2>3. Finalidades e bases legais (LGPD)</h2>
        <ul>
          <li>
            Responder pedidos de demonstração e contato comercial — art. 7º,
            I (consentimento) e V (execução de procedimentos preliminares).
          </li>
          <li>
            Criar e gerir contas, autenticar usuários e prestar o serviço —
            art. 7º, V (execução de contrato).
          </li>
          <li>
            Cumprir obrigações legais/regulatórias e exercer direitos em
            processo — art. 7º, II e VI.
          </li>
          <li>
            Melhorar segurança, prevenir fraude e analisar uso agregado do
            site — art. 7º, IX (legítimo interesse), com avaliação de
            impacto quando cabível.
          </li>
          <li>
            Cookies não essenciais / marketing — apenas com consentimento
            (art. 7º, I).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>
          Utilizamos cookies essenciais para funcionamento do site (ex.:
          preferência de consentimento). Cookies analíticos ou de marketing só
          são ativados se você aceitar no banner. Você pode alterar a
          preferência a qualquer momento limpando o armazenamento local do
          navegador ou entrando em contato conosco.
        </p>
      </section>

      <section>
        <h2>5. Compartilhamento</h2>
        <p>
          Podemos compartilhar dados com provedores de infraestrutura
          (hospedagem), e-mail/comunicação, adquirentes e meios de pagamento,
          e autoridades quando houver obrigação legal — sempre com contratos e
          medidas de segurança adequadas. Não vendemos dados pessoais.
        </p>
      </section>

      <section>
        <h2>6. Retenção</h2>
        <ul>
          <li>
            Leads de demonstração: até 24 meses após o último contato, ou
            até solicitação de exclusão, o que ocorrer primeiro.
          </li>
          <li>
            Dados contratuais e fiscais: pelos prazos legais aplicáveis.
          </li>
          <li>
            Logs de segurança: tipicamente até 12 meses, salvo necessidade
            maior de investigação.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Seus direitos (titular)</h2>
        <p>
          Nos termos da LGPD, você pode solicitar: confirmação de tratamento,
          acesso, correção, anonimização, portabilidade, eliminação de dados
          tratados com consentimento, informação sobre compartilhamentos e
          revogação do consentimento. Envie o pedido para{' '}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a> ou{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Também é possível reclamar
          à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </section>

      <section>
        <h2>8. Segurança</h2>
        <p>
          Adotamos medidas técnicas e administrativas razoáveis (controle de
          acesso, HTTPS, segregação de ambientes). Nenhum sistema é 100%
          isento de risco; em incidente relevante, comunicaremos conforme a
          legislação.
        </p>
      </section>

      <section>
        <h2>9. Menores</h2>
        <p>
          O site institucional e o formulário de leads destinam-se a
          profissionais e empresas. Não coletamos intencionalmente dados de
          menores de 18 anos nesse canal.
        </p>
      </section>

      <section>
        <h2>10. Alterações</h2>
        <p>
          Esta política pode ser atualizada. A data no topo indica a versão
          vigente. O uso continuado após alterações relevantes implica ciência
          da nova versão, quando a lei permitir.
        </p>
      </section>
    </LegalShell>
  );
}
