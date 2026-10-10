import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  EmptyState,
  Icon,
  PageHeading,
  Skeleton,
  ThemeToggle,
} from "../components/ui.jsx";
import { api } from "../lib/api.js";
import "../styles/auth.css";

function storedSession() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function clearSession() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("passwordLength");
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  window.dispatchEvent(new Event("busapp-session"));
}

export default function UserProfile() {
  const [token, setToken] = useState(storedSession);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [request, setRequest] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    api("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data?.user) throw new Error("Invalid profile response");
        setUser(data.user);
        try {
          localStorage.setItem("user", JSON.stringify(data.user));
        } catch {
          /* The profile still works without persistent storage. */
        }
        window.dispatchEvent(new Event("busapp-session"));
      })
      .catch((failure) => {
        if (controller.signal.aborted || failure.name === "AbortError") return;
        if (failure.status === 401 || failure.status === 404) {
          clearSession();
          setToken("");
          setExpired(true);
        } else {
          setError(
            "Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, request]);

  function retry() {
    setLoading(true);
    setError("");
    setRequest((value) => value + 1);
  }

  function logout() {
    clearSession();
    navigate("/directions", { replace: true });
  }

  const name = typeof user?.name === "string" ? user.name : "Seu perfil";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="profile-page">
      <PageHeading
        eyebrow="DO SEU JEITO"
        title="Meu perfil"
        description="Sua conta e suas preferências, em um só lugar."
      />
      {!token ? (
        <div className="card profile-visitor-card">
          <EmptyState
            icon="user"
            title={
              expired
                ? "Vamos entrar de novo?"
                : "Seu próximo caminho começa aqui"
            }
            description={
              expired
                ? "Sua sessão expirou. Entre novamente para acessar seu perfil."
                : "Entre ou crie uma conta para acessar seu perfil. Você pode continuar consultando linhas e trajetos sem cadastro."
            }
          >
            <div className="profile-visitor-actions">
              <Link className="button button-primary" to="/login">
                Entrar
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link className="button button-secondary" to="/register">
                Criar conta
              </Link>
            </div>
          </EmptyState>
        </div>
      ) : loading ? (
        <div
          className="card profile-loading"
          role="status"
          aria-label="Carregando seu perfil"
        >
          <Skeleton className="profile-avatar-skeleton" />
          <Skeleton />
          <Skeleton />
          <span className="sr-only">Carregando seu perfil…</span>
        </div>
      ) : error ? (
        <div className="card profile-visitor-card">
          <EmptyState
            icon="alert"
            title="Seu perfil não carregou"
            description={error}
          >
            <button className="button button-primary" onClick={retry}>
              <Icon name="refresh" size={18} />
              Tentar novamente
            </button>
            <button className="button button-ghost" onClick={logout}>
              Sair da conta
            </button>
          </EmptyState>
        </div>
      ) : (
        <section
          className="card profile-account"
          aria-labelledby="profile-account-title"
        >
          <div className="profile-account-heading">
            <div className="profile-avatar" aria-hidden="true">
              {initials || <Icon name="user" size={28} />}
            </div>
            <div>
              <span className="eyebrow">CONTA BUS APP</span>
              <h2 id="profile-account-title">{name}</h2>
              <p className="muted">Bom ter você por aqui.</p>
            </div>
            <span className="badge profile-session-badge">
              <Icon name="check" size={14} />
              Conectado
            </span>
          </div>
          <dl className="profile-details">
            <div>
              <dt>
                <Icon name="user" size={18} />
                Nome
              </dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>
                <Icon name="mail" size={18} />
                E-mail
              </dt>
              <dd>{user?.email || "E-mail não informado"}</dd>
            </div>
          </dl>
          <div className="profile-account-footer">
            <span className="muted">
              Ao sair, você continua podendo explorar a cidade.
            </span>
            <button className="button button-secondary" onClick={logout}>
              <Icon name="logout" size={18} />
              Sair da conta
            </button>
          </div>
        </section>
      )}
      <div className="profile-secondary-grid">
        <section
          className="card profile-preferences"
          aria-labelledby="profile-preferences-title"
        >
          <span className="profile-card-icon">
            <Icon name="settings" size={22} />
          </span>
          <h2 id="profile-preferences-title">Uma experiência sua</h2>
          <p className="muted">Escolha o tema mais confortável para navegar.</p>
          <div className="profile-theme-row">
            <div>
              <strong>Aparência</strong>
              <span className="muted">Preferência salva neste navegador</span>
            </div>
            <ThemeToggle />
          </div>
        </section>
        <section
          className="card profile-explore"
          aria-labelledby="profile-explore-title"
        >
          <span className="profile-card-icon">
            <Icon name="route" size={22} />
          </span>
          <h2 id="profile-explore-title">A cidade te espera</h2>
          <p className="muted">
            Encontre suas linhas e marque as favoritas para voltar a elas mais
            rápido.
          </p>
          <div className="profile-quick-links">
            <Link to="/lines">
              Explorar linhas
              <Icon name="arrow-up-right" size={18} />
            </Link>
            <Link to="/directions">
              Planejar um trajeto
              <Icon name="arrow-up-right" size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
