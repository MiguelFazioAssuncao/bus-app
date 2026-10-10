import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthFrame from "../components/AuthFrame.jsx";
import { Icon } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import "../styles/auth.css";

function validate(values) {
  return {
    name:
      values.name.trim().length >= 2
        ? ""
        : "Informe seu nome com pelo menos 2 caracteres.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      ? ""
      : "Use um e-mail válido, como voce@exemplo.com.",
    password:
      values.password.length >= 8
        ? ""
        : "Sua senha precisa ter pelo menos 8 caracteres.",
  };
}

export default function Register() {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeRequest = useRef(null);
  const navigate = useNavigate();
  const errors = validate(values);
  useEffect(() => () => activeRequest.current?.abort(), []);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setTouched({ name: true, email: true, password: true });
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
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      // Registration creates a profile; the API starts a session only after login.
      navigate("/login", {
        replace: true,
        state: {
          message: "Conta criada! Entre com seu e-mail e senha para continuar.",
        },
      });
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure.status === 400 || failure.status === 409
            ? "Já existe uma conta com esse e-mail. Entre ou use outro endereço."
            : "Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <span className="eyebrow">VAMOS JUNTOS</span>
      <h1 className="auth-title">
        A cidade está
        <br />
        logo ali.
      </h1>
      <p className="auth-description">
        Crie sua conta em poucos passos. Os trajetos continuam disponíveis sem
        cadastro.
      </p>
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
      >
        <div className="field">
          <label htmlFor="register-name">Nome</label>
          <div className="auth-input-wrap">
            <Icon name="user" size={20} />
            <input
              id="register-name"
              className="input"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Como podemos chamar você?"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              onBlur={() => setTouched((value) => ({ ...value, name: true }))}
              aria-invalid={Boolean(touched.name && errors.name)}
              aria-describedby={
                touched.name && errors.name ? "register-name-error" : undefined
              }
              required
              minLength={2}
            />
          </div>
          {touched.name && errors.name && (
            <p
              id="register-name-error"
              className="auth-field-error"
              aria-live="polite"
            >
              {errors.name}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="register-email">E-mail</label>
          <div className="auth-input-wrap">
            <Icon name="mail" size={20} />
            <input
              id="register-email"
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@exemplo.com"
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              onBlur={() => setTouched((value) => ({ ...value, email: true }))}
              aria-invalid={Boolean(touched.email && errors.email)}
              aria-describedby={
                touched.email && errors.email
                  ? "register-email-error"
                  : undefined
              }
              required
            />
          </div>
          {touched.email && errors.email && (
            <p
              id="register-email-error"
              className="auth-field-error"
              aria-live="polite"
            >
              {errors.email}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="register-password">Senha</label>
          <div className="auth-input-wrap auth-password-wrap">
            <Icon name="lock" size={20} />
            <input
              id="register-password"
              className="input"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Crie uma senha"
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              onBlur={() =>
                setTouched((value) => ({ ...value, password: true }))
              }
              aria-invalid={Boolean(touched.password && errors.password)}
              aria-describedby={
                touched.password && errors.password
                  ? "register-password-help register-password-error"
                  : "register-password-help"
              }
              required
              minLength={8}
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
          <p id="register-password-help" className="auth-field-help">
            Use pelo menos 8 caracteres.
          </p>
          {touched.password && errors.password && (
            <p
              id="register-password-error"
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
              Criando conta…
            </>
          ) : (
            <>
              Criar conta
              <Icon name="arrow-right" size={18} />
            </>
          )}
        </button>
      </form>
      <p className="auth-switch">
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
      <Link to="/directions" className="auth-visitor">
        Explorar sem conta
        <Icon name="arrow-up-right" size={16} />
      </Link>
    </AuthFrame>
  );
}
