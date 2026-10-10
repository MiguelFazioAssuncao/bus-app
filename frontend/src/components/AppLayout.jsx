import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon, ThemeToggle } from "./ui.jsx";
import { readStorage } from "../lib/storage.js";

const navigation = [
  { to: "/directions", icon: "route", label: "Visão geral" },
  { to: "/search", icon: "search", label: "Explorar" },
  { to: "/lines", icon: "bus", label: "Linhas de ônibus" },
  { to: "/stations", icon: "map", label: "Mapa e trajetos" },
];
export default function AppLayout({ children }) {
  const location = useLocation();
  const main = useRef(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [session, setSession] = useState(() => {
    try {
      return {
        user: readStorage("user", null),
        authenticated: !!localStorage.getItem("token"),
      };
    } catch {
      return { user: null, authenticated: false };
    }
  });
  const { user, authenticated } = session;
  const displayName =
    typeof user?.name === "string" ? user.name.split(" ")[0] : "Minha conta";
  useEffect(() => {
    const update = () => {
      try {
        setSession({
          user: readStorage("user", null),
          authenticated: !!localStorage.getItem("token"),
        });
      } catch {
        setSession({ user: null, authenticated: false });
      }
    };
    window.addEventListener("busapp-session", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("busapp-session", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
    const titles = {
      "/directions": "Seu próximo destino",
      "/search": "Explorar São Paulo",
      "/lines": "Linhas de ônibus",
      "/stations": "Mapa e trajetos",
      "/profile": "Sua conta",
    };
    document.title = `${titles[location.pathname] || "São Paulo em movimento"} · Bus App`;
  }, [location.pathname]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link
          to="/directions"
          className="brand"
          aria-label="Bus App, página inicial"
        >
          <span className="brand-mark">
            <Icon name="bus" size={26} />
          </span>
          <span>
            bus<span className="brand-light">app</span>
            <small>SUA CIDADE, MAIS PERTO</small>
          </span>
        </Link>
        <div className="sidebar-label">SEU DIA EM MOVIMENTO</div>
        <nav aria-label="Navegação principal" className="desktop-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon name={item.icon} size={21} />
              <span>{item.label}</span>
              <Icon name="chevron-right" size={15} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="city-note">
            <span className="city-note-icon">
              <Icon name="pin" />
            </span>
            <span>
              <strong>São Paulo</strong>
              <small>Mil caminhos. Sua cidade.</small>
            </span>
          </div>
          <ThemeToggle />
          <div className="sidebar-credit">
            Feito para ir mais longe.
            <span>Bus App © {new Date().getFullYear()}</span>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span className="topbar-location">
            <Icon name="pin" size={16} /> São Paulo, SP
          </span>
          <span className="topbar-tagline">A cidade acontece. Vá junto.</span>
          <div className="topbar-actions">
            <div className="mobile-theme">
              <ThemeToggle />
            </div>
            <Link
              to="/search"
              className="icon-button topbar-search"
              aria-label="Buscar um destino"
            >
              <Icon name="search" />
            </Link>
            <Link
              to={authenticated ? "/profile" : "/login"}
              className="account-link"
            >
              <span className="account-avatar">
                <Icon name="user" size={17} />
              </span>
              <span>
                {authenticated ? displayName || "Minha conta" : "Entrar"}
              </span>
              <Icon name="chevron-right" size={14} />
            </Link>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <Icon name="info" size={17} /> Você está offline. Nesta sessão, os
            locais já carregados continuam disponíveis. Consultas precisam de
            conexão.
          </div>
        )}
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="page-container"
        >
          <div key={location.pathname} className="page-enter">
            {children}
          </div>
        </main>
        <footer className="content-footer">
          <span>Um jeito mais simples de viver a cidade.</span>
          <span>São Paulo ↗</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Navegação no celular">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-nav-link ${isActive ? "active" : ""}`
            }
            aria-label={item.label}
          >
            <Icon name={item.icon} size={21} />
            <span>
              {item.to === "/lines"
                ? "Linhas"
                : item.to === "/stations"
                  ? "Mapa"
                  : item.to === "/directions"
                    ? "Início"
                    : "Explorar"}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
