import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, Icon, PageHeading, Skeleton } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { normalize } from "../lib/locations.js";
import { readStorage, userKey, writeStorage } from "../lib/storage.js";
import "../styles/search-lines.css";

const PAGE_SIZE = 6;
const formatCount = (value) => new Intl.NumberFormat("pt-BR").format(value);
const formatTime = (date) =>
  date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
function parseLines(data) {
  if (!data || !Array.isArray(data.l))
    throw new Error("Resposta de posições indisponível.");
  return data.l
    .filter((line) => line && typeof line === "object")
    .map((line, index) => ({
      id: String(line.cl ?? `${line.c || "line"}-${line.sl || index}`),
      code: String(line.c || "Linha sem código"),
      from: String(line.lt0 || "Terminal não informado"),
      to: String(line.lt1 || "Terminal não informado"),
      vehicles: Array.isArray(line.vs) ? line.vs : [],
    }));
}
function vehicleCoordinates(vehicle) {
  if (!vehicle || typeof vehicle !== "object") return null;
  const longitude = vehicle.px ?? vehicle.plg;
  if (
    vehicle.py === undefined ||
    vehicle.py === null ||
    vehicle.py === "" ||
    longitude === undefined ||
    longitude === null ||
    longitude === ""
  )
    return null;
  const lat = Number(vehicle.py),
    lng = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  return `${lat},${lng}`;
}

export default function Lines() {
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("code");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [storageKey] = useState(() => userKey("favoriteLines"));
  const [favorites, setFavorites] = useState(() => {
    const stored = readStorage(userKey("favoriteLines"), []);
    return Array.isArray(stored)
      ? stored
          .filter(
            (value) => typeof value === "string" || typeof value === "number",
          )
          .map(String)
      : [];
  });
  const [storageError, setStorageError] = useState(false);
  const requestRef = useRef(null);
  const refresh = useCallback(async () => {
    // Keep the previous snapshot on failure, and avoid concurrent refresh requests.
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setRefreshing(true);
    try {
      const data = await api("/lines/positions", { signal: controller.signal });
      if (controller.signal.aborted) return;
      setItems(parseLines(data));
      setLastUpdated(new Date());
      setError(false);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) {
        setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    const whenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    whenVisible();
    const timer = setInterval(whenVisible, 30000);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", whenVisible);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    writeStorage(storageKey, favorites);
  }, [favorites, storageKey]);
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return items
      .filter(
        (item) =>
          (!term ||
            normalize(`${item.code} ${item.from} ${item.to}`).includes(term)) &&
          (!onlyFavorites || favorites.includes(item.id)),
      )
      .sort((a, b) =>
        sort === "vehicles"
          ? b.vehicles.length - a.vehicles.length
          : sort === "name"
            ? a.from.localeCompare(b.from, "pt-BR")
            : a.code.localeCompare(b.code, "pt-BR", { numeric: true }),
      );
  }, [favorites, items, onlyFavorites, query, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const vehicleCount = items.reduce(
    (total, item) => total + item.vehicles.length,
    0,
  );
  const toggleFavorite = (id) => {
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id];
    setFavorites(next);
    if (!writeStorage(storageKey, next)) setStorageError(true);
  };
  const resetFilters = () => {
    setQuery("");
    setOnlyFavorites(false);
    setPage(1);
  };

  return (
    <div className="lines-page">
      <PageHeading
        eyebrow="Acompanhe a cidade"
        title="Sua linha, por aqui."
        description="Busque pelo número ou pelos terminais e acompanhe os veículos localizados pela SPTrans."
      >
        <button
          className="button button-secondary"
          onClick={refresh}
          disabled={refreshing}
        >
          <Icon
            name="refresh"
            size={17}
            className={refreshing ? "is-spinning" : ""}
          />{" "}
          {refreshing ? "Atualizando" : "Atualizar"}
        </button>
      </PageHeading>
      <div className="lines-overview">
        <div className="card lines-stat">
          <span className="lines-stat-icon">
            <Icon name="route" size={23} />
          </span>
          <div>
            <span className="muted">Linhas / sentidos informados</span>
            <strong>{lastUpdated ? formatCount(items.length) : "—"}</strong>
          </div>
        </div>
        <div className="card lines-stat">
          <span className="lines-stat-icon">
            <Icon name="bus" size={23} />
          </span>
          <div>
            <span className="muted">Veículos localizados</span>
            <strong>{lastUpdated ? formatCount(vehicleCount) : "—"}</strong>
          </div>
        </div>
        <div className="card lines-update-card">
          <span
            className={`lines-status-dot ${lastUpdated && !error ? "is-online" : ""}`}
          />
          <div>
            <strong>
              {error
                ? "Consulta indisponível"
                : initialLoading
                  ? "Consultando a SPTrans"
                  : "Atualização automática"}
            </strong>
            <span className="muted">
              {lastUpdated
                ? `Dados recebidos às ${formatTime(lastUpdated)} · a cada 30 s`
                : "Posições fornecidas pela SPTrans"}
            </span>
          </div>
        </div>
      </div>
      <div className="card lines-toolbar">
        <div className="lines-search-field">
          <Icon name="search" size={20} />
          <label htmlFor="line-query" className="sr-only">
            Buscar linha por número ou terminal
          </label>
          <input
            className="input"
            id="line-query"
            type="search"
            value={query}
            placeholder="Número da linha ou terminal"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="lines-toolbar-controls">
          <button
            className={`button lines-favorite-filter ${onlyFavorites ? "is-active" : "button-secondary"}`}
            aria-pressed={onlyFavorites}
            onClick={() => {
              setOnlyFavorites((current) => !current);
              setPage(1);
            }}
          >
            <Icon name="star" size={17} /> Favoritas
          </button>
          <div className="lines-sort-field">
            <Icon name="sort" size={17} />
            <label htmlFor="line-sort" className="sr-only">
              Ordenar linhas
            </label>
            <select
              className="input"
              id="line-sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              <option value="code">Número da linha</option>
              <option value="name">Nome do terminal</option>
              <option value="vehicles">Mais veículos</option>
            </select>
          </div>
        </div>
      </div>
      {error && (
        <div className="status-message error lines-error" role="alert">
          <Icon name="alert" size={20} />
          <div>
            <strong>
              {lastUpdated
                ? "Não conseguimos atualizar agora"
                : "Não foi possível consultar os ônibus"}
            </strong>
            <p>
              {lastUpdated
                ? "As últimas posições recebidas continuam abaixo e podem estar desatualizadas."
                : "Confira sua conexão e tente novamente. As posições dependem da disponibilidade do serviço da SPTrans."}
            </p>
            {lastUpdated && (
              <small>
                Última consulta bem-sucedida:{" "}
                {lastUpdated.toLocaleString("pt-BR")}
              </small>
            )}
          </div>
          <button
            className="button button-secondary"
            disabled={refreshing}
            onClick={refresh}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {storageError && (
        <p className="status-message error" role="status">
          Seu navegador não permitiu salvar suas linhas favoritas. Elas ficam
          disponíveis nesta sessão.
        </p>
      )}
      <div className="lines-results-heading">
        <h2>{onlyFavorites ? "Suas linhas favoritas" : "Linhas da cidade"}</h2>
        <span className="muted" role="status" aria-live="polite">
          {initialLoading
            ? "Buscando posições…"
            : `${formatCount(filtered.length)} ${filtered.length === 1 ? "resultado" : "resultados"}`}
        </span>
      </div>
      {initialLoading ? (
        <div
          className="lines-grid"
          aria-label="Carregando linhas"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div className="card line-card line-skeleton" key={index}>
              <Skeleton className="line-skeleton-code" />
              <Skeleton className="line-skeleton-text" />
              <Skeleton className="line-skeleton-text short" />
              <Skeleton className="line-skeleton-footer" />
            </div>
          ))}
        </div>
      ) : paginated.length ? (
        <>
          <div className="lines-grid" aria-busy={refreshing}>
            {paginated.map((item) => {
              const saved = favorites.includes(item.id);
              const coordinates = item.vehicles
                .map(vehicleCoordinates)
                .find(Boolean);
              return (
                <article className="card line-card" key={item.id}>
                  <div className="line-card-header">
                    <span className="line-code">
                      <Icon name="bus" size={18} /> {item.code}
                    </span>
                    <button
                      className={`icon-button line-save ${saved ? "is-saved" : ""}`}
                      onClick={() => toggleFavorite(item.id)}
                      aria-pressed={saved}
                      aria-label={`${saved ? "Remover" : "Salvar"} linha ${item.code}, ${item.from} e ${item.to}, ${saved ? "das" : "nas"} favoritas`}
                    >
                      <Icon name="star" size={20} />
                    </button>
                  </div>
                  <div className="line-terminals">
                    <span className="line-terminal-dot" />
                    <p>
                      <span>Terminal</span>
                      <strong>{item.from}</strong>
                    </p>
                    <span className="line-terminal-dot is-destination" />
                    <p>
                      <span>Terminal</span>
                      <strong>{item.to}</strong>
                    </p>
                  </div>
                  <div className="line-card-footer">
                    <span className="line-vehicle-count">
                      <Icon name="bus" size={17} />
                      <strong>{formatCount(item.vehicles.length)}</strong>{" "}
                      {item.vehicles.length === 1
                        ? "veículo localizado"
                        : "veículos localizados"}
                    </span>
                    {coordinates && (
                      <Link
                        to={`/stations?${new URLSearchParams({ from: coordinates })}`}
                        className="line-map-link"
                        aria-label={`Ver localização de um veículo da linha ${item.code} no mapa`}
                      >
                        <Icon name="map" size={16} /> Ver no mapa{" "}
                        <Icon name="arrow-up-right" size={14} />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <nav className="lines-pagination" aria-label="Páginas de linhas">
            <button
              className="button button-secondary"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <Icon name="arrow-left" size={16} /> Anterior
            </button>
            <span className="muted" aria-live="polite">
              Página <strong>{currentPage}</strong> de {totalPages}
            </span>
            <button
              className="button button-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Próxima <Icon name="arrow-right" size={16} />
            </button>
          </nav>
        </>
      ) : (
        <div className="card lines-empty">
          <EmptyState
            icon={error ? "alert" : onlyFavorites ? "star" : "search"}
            title={
              error
                ? "Vamos tentar de novo?"
                : onlyFavorites
                  ? "Suas favoritas ficam aqui"
                  : query
                    ? "Nenhuma linha encontrada"
                    : "Nenhuma posição recebida"
            }
            description={
              error
                ? "A consulta está temporariamente indisponível. Você pode tentar novamente a qualquer momento."
                : onlyFavorites
                  ? "Marque a estrela de uma linha para encontrá-la mais rápido. As favoritas aparecem quando a SPTrans informa posições para elas."
                  : query
                    ? "Tente outro número ou nome de terminal."
                    : "A SPTrans não informou posições de veículos nesta consulta."
            }
          >
            {error ? (
              <button
                className="button button-primary"
                disabled={refreshing}
                onClick={refresh}
              >
                <Icon name="refresh" size={17} /> Consultar novamente
              </button>
            ) : (
              (query || onlyFavorites) && (
                <button
                  className="button button-secondary"
                  onClick={resetFilters}
                >
                  Ver todas as linhas
                </button>
              )
            )}
          </EmptyState>
        </div>
      )}
      <p className="lines-data-note">
        <Icon name="info" size={16} /> As posições indicam veículos localizados,
        sem previsão de chegada. Os dois terminais identificam o trajeto
        informado.
      </p>
    </div>
  );
}
