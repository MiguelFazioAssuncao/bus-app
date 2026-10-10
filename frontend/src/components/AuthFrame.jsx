import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon, ThemeToggle } from "./ui.jsx";

export default function AuthFrame({ children }) {
  const location = useLocation();
  const content = useRef(null);
  useEffect(() => {
    document.title = `${location.pathname === "/register" ? "Crie sua conta" : "Entre na sua conta"} · Bus App`;
    window.scrollTo({ top: 0 });
    content.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <div className="auth-shell">
      <a className="auth-skip-link" href="#auth-content">
        Ir para o formulário
      </a>
      <header className="auth-header">
        <Link
          to="/directions"
          className="auth-brand"
          aria-label="Bus App, explorar trajetos"
        >
          <span className="auth-brand-mark">
            <Icon name="bus" size={25} />
          </span>
          bus<span>app</span>
          <span className="auth-brand-dot" aria-hidden="true">
            .
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <aside
        className="auth-story"
        aria-label="Bus App, mobilidade em São Paulo"
      >
        <span className="auth-story-label">
          <span aria-hidden="true" />
          SÃO PAULO EM MOVIMENTO
        </span>
        <h2>
          Mais cidade.
          <br />
          Menos complicação.
        </h2>
        <p>
          Encontre sua linha. Planeje o caminho.
          <br />
          Vá no seu ritmo.
        </p>
        <div className="auth-illustration" aria-hidden="true">
          <svg
            viewBox="0 0 560 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30 245H530M90 245V145H170V245M390 245V91H467V245M425 91V66M210 245V182H267"
              stroke="currentColor"
              strokeWidth="2"
              opacity=".13"
            />
            <path
              d="M109 179V191M130 179V191M151 179V191M409 111V125M431 111V125M451 111V125M409 147V161M431 147V161M451 147V161M409 184V198M431 184V198M451 184V198"
              stroke="currentColor"
              strokeWidth="3"
              opacity=".15"
            />
            <path
              d="M59 195C109 195 141 110 195 110H345C407 110 390 209 495 209"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="7 11"
              opacity=".35"
            />
            <circle
              cx="59"
              cy="195"
              r="10"
              fill="var(--surface)"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle cx="495" cy="209" r="10" fill="currentColor" />
            <circle cx="495" cy="209" r="4" fill="var(--surface)" />
            <rect
              x="198"
              y="141"
              width="169"
              height="85"
              rx="16"
              fill="var(--surface)"
            />
            <rect
              x="203"
              y="146"
              width="159"
              height="73"
              rx="13"
              fill="var(--brand)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="212"
              y="157"
              width="92"
              height="31"
              rx="5"
              fill="currentColor"
              opacity=".85"
            />
            <path
              d="M242 157V188M272 157V188"
              stroke="var(--brand)"
              strokeWidth="3"
            />
            <path
              d="M315 158H341C346 158 350 162 350 168V208H315V158Z"
              fill="currentColor"
              opacity=".85"
            />
            <path d="M332 158V208" stroke="var(--brand)" strokeWidth="3" />
            <path
              d="M210 197H299"
              stroke="currentColor"
              strokeWidth="2"
              opacity=".35"
            />
            <circle cx="234" cy="220" r="13" fill="currentColor" />
            <circle cx="234" cy="220" r="5" fill="var(--surface)" />
            <circle cx="329" cy="220" r="13" fill="currentColor" />
            <circle cx="329" cy="220" r="5" fill="var(--surface)" />
          </svg>
          <div className="auth-illustration-caption">
            <span>Você</span>
            <Icon name="arrow-right" size={18} />
            <span>Seu destino</span>
          </div>
        </div>
        <div className="auth-story-footer">
          <Icon name="route" size={18} />
          <span>Uma cidade de possibilidades. Um caminho de cada vez.</span>
        </div>
      </aside>
      <main
        ref={content}
        id="auth-content"
        className="auth-content"
        tabIndex={-1}
      >
        <div className="auth-content-inner">{children}</div>
        <p className="auth-bottom-note">Feito para quem vive São Paulo.</p>
      </main>
    </div>
  );
}
