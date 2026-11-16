import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'pdv_cookie_consent_v1';

type Consent = 'accepted' | 'essential';

function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'essential') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function writeConsent(value: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Banner LGPD — cookies essenciais sempre; analíticos só com aceite. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  function choose(value: Consent) {
    writeConsent(value);
    setVisible(false);
    window.dispatchEvent(
      new CustomEvent('pdv-cookie-consent', { detail: value }),
    );
  }

  if (!visible) return null;

  return (
    <div className="lp-cookie" role="dialog" aria-label="Preferências de cookies">
      <div className="lp-cookie-inner">
        <p>
          Usamos cookies essenciais para o site funcionar e, com o seu
          consentimento, cookies para entender o uso da página. Veja a{' '}
          <Link to="/privacidade">Política de Privacidade</Link>.
        </p>
        <div className="lp-cookie-actions">
          <button
            type="button"
            className="lp-btn lp-btn-ghost lp-btn-sm"
            onClick={() => choose('essential')}
          >
            Só essenciais
          </button>
          <button
            type="button"
            className="lp-btn lp-btn-amber lp-btn-sm"
            onClick={() => choose('accepted')}
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
