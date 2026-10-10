import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthFrame from "../components/AuthFrame.jsx";
import { Icon } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import "../styles/auth.css";

const emailError = (value) => {
  if (!value.trim()) return "Informe seu e-mail.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? ""
    : "Use um e-mail válido, como voce@exemplo.com.";
};

const loginError = (error) => {
  if (error.code === "SESSION_STORAGE")
    return "Seu navegador não permitiu salvar o acesso. Confira as permissões de armazenamento e tente novamente.";
  if (error.status === 401 || error.status === 404)
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  if (error.status === 429)
    return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  return "Não foi possível entrar agora. Verifique sua conexão e tente novamente.";
};

function saveSession(data) {
  let previousToken;
  let previousUser;
  try {
    previousToken = localStorage.getItem("token");
    previousUser = localStorage.getItem("user");
    // Keep the session and safe server profile together, without password metadata.
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    localStorage.removeItem("passwordLength");
  } catch {
    // Restore the previous session if a browser storage write fails partway through.
    try {
      for (const [key, value] of [
        ["token", previousToken],
        ["user", previousUser],
      ]) {
        if (value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    } catch {
      /* Storage may reject both writes and cleanup. */
    }
    const error = new Error("Session storage unavailable");
    error.code = "SESSION_STORAGE";
    throw error;
  }
  window.dispatchEvent(new Event("busapp-session"));
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeRequest = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const errors = {
    email: emailError(email),
    password: password ? "" : "Informe sua senha.",
  };
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setTouched({ email: true, password: true });
    setError("");
    const invalidField = Object.keys(errors).find((field) => errors[field]);
    if (invalidField) {
      event.currentTarget.elements.namedItem(invalidField)?.focus();
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!data?.token || !data?.user)
        throw new Error("Invalid login response");
      saveSession(data);
      navigate("/directions", { replace: true });
    } catch (failure) {
      if (!controller.signal.aborted) setError(loginError(failure));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <span className="eyebrow">BEM-VINDO DE VOLTA</span>
      <h1 className="auth-title">
        Seu caminho,
        <br />
        mais simples.
      </h1>
      <p className="auth-description">
        Entre para acessar seu perfil e continuar sua experiência pela cidade.
      </p>
      {location.state?.message && (
        <p className="status-message success auth-feedback" role="status">
          <Icon name="check" size={18} />
          {location.state.message}
        </p>
      )}
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
      >
        <div className="field">
          <label htmlFor="login-email">E-mail</label>
          <div className="auth-input-wrap">
            <Icon name="mail" size={20} />
            <input
              id="login-email"
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((value) => ({ ...value, email: true }))}
              aria-invalid={Boolean(touched.email && errors.email)}
              aria-describedby={
                touched.email && errors.email ? "login-email-error" : undefined
              }
              required
            />
          </div>
          {touched.email && errors.email && (
            <p
              id="login-email-error"
              className="auth-field-error"
              aria-live="polite"
            >
              {errors.email}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="login-password">Senha</label>
          <div className="auth-input-wrap auth-password-wrap">
            <Icon name="lock" size={20} />
            <input
              id="login-password"
              className="input"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() =>
                setTouched((value) => ({ ...value, password: true }))
              }
              aria-invalid={Boolean(touched.password && errors.password)}
              aria-describedby={
                touched.password && errors.password
                  ? "login-password-error"
                  : undefined
              }
              required
            />
            <button
              className="icon-button auth-password-toggle"
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={20} />
            </button>
          </div>
          {touched.password && errors.password && (
            <p
              id="login-password-error"
              className="auth-field-error"
              aria-live="polite"
            >
              {errors.password}
            </p>
          )}
        </div>
        {error && (
          <p className="status-message error auth-feedback" role="alert">
            <Icon name="alert" size={18} />
            {error}
          </p>
        )}
        <button
          className="button button-primary auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              Entrando…
            </>
          ) : (
            <>
              Entrar
              <Icon name="arrow-right" size={18} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        Primeira vez por aqui? <Link to="/register">Crie sua conta</Link>
      </p>
      <Link to="/directions" className="auth-visitor">
        Explorar sem conta
        <Icon name="arrow-up-right" size={16} />
      </Link>
    </AuthFrame>
  );
}
