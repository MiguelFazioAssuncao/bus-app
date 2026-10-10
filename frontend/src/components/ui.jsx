import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { getTheme, subscribeTheme, toggleTheme } from "../lib/theme.js";

const paths = {
  bus: "M5 16V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11M5 10h14M5 16h14M7 16v3M17 16v3M8 13h.01M16 13h.01M8 3v7M16 3v7",
  route:
    "M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8v5a3 3 0 0 0 3 3h6M18 16V8a3 3 0 0 0-3-3h-4",
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8",
  briefcase: "M3 7h18v13H3V7ZM8 7V3h8v4M3 12c5 3 13 3 18 0M10 12h4v4h-4z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16 16l5 5",
  "arrow-right": "M4 12h16m-7-7 7 7-7 7",
  "arrow-left": "M20 12H4m7-7-7 7 7 7",
  "arrow-up-right": "M6 18 18 6M6 6h12v12",
  "chevron-right": "m9 5 7 7-7 7",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z",
  plus: "M12 5v14M5 12h14",
  x: "m6 6 12 12M18 6 6 18",
  refresh:
    "M20 7a9 9 0 0 0-15-2L2 8M2 3v5h5M4 17a9 9 0 0 0 15 2l3-3M22 21v-5h-5",
  alert: "m12 3 10 18H2L12 3ZM12 9v4M12 17h.01",
  check: "m5 12 4 4L19 6",
  filter: "M4 5h16M7 12h10M10 19h4",
  sort: "M4 6h16M4 12h11M4 18h6",
  "arrow-down-up": "M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4",
  navigation: "m3 10 18-7-7 18-3-8-8-3Z",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 8 8 15 8-7 12-11 8-15Z",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  logout: "M9 3H3v18h6M8 12h13m-4-4 4 4-4 4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  "eye-off":
    "m3 3 18 18M10 5c6-1 12 7 12 7s-2 3-5 5M6 6C4 8 2 12 2 12s4 7 10 7c2 0 3-.5 4-1",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  lock: "M5 10h14v11H5V10ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  settings:
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9 2h6l1 4 4 1 2 5-3 3-1 5-6 2-4-3-5-1-1-6 3-4 1-4 3-2Z",
  leaf: "M20 3C8 2 2 8 5 15s14 6 15-12ZM4 21 16 9",
  train:
    "M5 17V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12H5ZM5 10h14M8 14h.01M16 14h.01M8 17l-3 4M16 17l3 4",
  menu: "M4 6h16M4 12h16M4 18h16",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6M12 7h.01",
};
export function Icon({ name, size = 20, className = "", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d={paths[name] || paths.pin} />
    </svg>
  );
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      <span>Tema {theme === "dark" ? "claro" : "escuro"}</span>
    </button>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function EmptyState({ icon = "search", title, description, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={25} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {children}
    </div>
  );
}
export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
export function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  const id = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  // Native dialog provides focus trapping, inert background and Escape support.
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) closeRef.current();
      }}
    >
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Fechar janela"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
