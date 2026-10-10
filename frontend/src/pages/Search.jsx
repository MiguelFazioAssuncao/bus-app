import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, Icon, Modal, PageHeading } from "../components/ui.jsx";
import { locations, normalize } from "../lib/locations.js";
import { readStorage, userKey, writeStorage } from "../lib/storage.js";
import "../styles/search-lines.css";

const validCoordinates = (place) =>
  Number.isFinite(place.lat) &&
  Number.isFinite(place.lng) &&
  Math.abs(place.lat) <= 90 &&
  Math.abs(place.lng) <= 180;
const locationKey = (place) =>
  validCoordinates(place)
    ? `${place.lat},${place.lng}`
    : normalize(`${place.name} ${place.address}`);
const parseCoordinate = (value) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));
const emptyForm = { name: "", address: "", lat: "", lng: "" };

// Migrate legacy title/subtitle records without persisting their SVG icon objects.
function readPlaces(key) {
  const stored = readStorage(key, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const name = String(item.name || item.title || "").trim();
      const known = locations.find(
        (place) => normalize(place.name) === normalize(name),
      );
      const hasLatitude =
        item.lat !== undefined && item.lat !== null && item.lat !== "";
      const hasLongitude =
        item.lng !== undefined && item.lng !== null && item.lng !== "";
      return {
        id: known?.id || String(item.id || `saved-${normalize(name)}`),
        name,
        address: String(item.address || item.subtitle || known?.address || ""),
        lat: hasLatitude ? Number(item.lat) : known?.lat,
        lng: hasLongitude ? Number(item.lng) : known?.lng,
        category: String(item.category || known?.category || "Meus lugares"),
      };
    })
    .filter((place) => place.name);
}
const uniquePlaces = (places) => [
  ...new Map(places.map((place) => [locationKey(place), place])).values(),
];
function placeIcon(place) {
  const label = normalize(`${place.name} ${place.category}`);
  if (label.includes("casa") || label.startsWith("home ")) return "home";
  if (label.includes("trabalho")) return "briefcase";
  if (label.includes("terminal")) return "bus";
  if (label.includes("parque")) return "leaf";
  if (label.includes("estacao")) return "train";
  return "pin";
}
function formErrors(form) {
  const errors = {};
  if (form.name.trim().length < 2)
    errors.name = "Use um nome com pelo menos 2 caracteres.";
  if (form.address.trim().length < 3)
    errors.address = "Informe o endereço para identificar este lugar.";
  if (
    !Number.isFinite(parseCoordinate(form.lat)) ||
    Math.abs(parseCoordinate(form.lat)) > 90
  )
    errors.lat = "Informe uma latitude entre −90 e 90.";
  if (
    !Number.isFinite(parseCoordinate(form.lng)) ||
    Math.abs(parseCoordinate(form.lng)) > 180
  )
    errors.lng = "Informe uma longitude entre −180 e 180.";
  return errors;
}
function PlaceRow({ place, recent, saved, onSelect, onFavorite }) {
  return (
    <article className="place-row">
      <button className="place-choice" onClick={() => onSelect(place)}>
        <span className={`place-icon ${recent ? "place-icon-recent" : ""}`}>
          <Icon name={recent ? "clock" : placeIcon(place)} size={21} />
        </span>
        <span className="place-copy">
          <strong>{place.name}</strong>
          <span>{place.address || "Complete os dados deste local salvo"}</span>
        </span>
        <Icon name="arrow-up-right" className="place-arrow" size={18} />
      </button>
      <button
        className={`icon-button place-save ${saved ? "is-saved" : ""}`}
        onClick={() => onFavorite(place)}
        aria-label={`${saved ? "Remover" : "Salvar"} ${place.name} ${saved ? "dos" : "nos"} favoritos`}
        aria-pressed={saved}
      >
        <Icon name="star" size={20} />
      </button>
    </article>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [favoriteKey] = useState(() => userKey("favorites"));
  const [recentKey] = useState(() => userKey("recents"));
  // Initialize before the first persistence effect, preserving saved browser data.
  const [favorites, setFavorites] = useState(() =>
    readPlaces(userKey("favorites")),
  );
  const [recents, setRecents] = useState(() => readPlaces(userKey("recents")));
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("Todos");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    writeStorage(favoriteKey, favorites);
  }, [favoriteKey, favorites]);
  useEffect(() => {
    writeStorage(recentKey, recents);
  }, [recentKey, recents]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const allPlaces = useMemo(
    () => uniquePlaces([...locations, ...recents, ...favorites]),
    [favorites, recents],
  );
  const categories = useMemo(
    () => [
      "Todos",
      ...new Set(locations.map((place) => place.category).filter(Boolean)),
    ],
    [],
  );
  const results = useMemo(() => {
    const source =
      tab === "favorites" ? favorites : tab === "recents" ? recents : allPlaces;
    const term = normalize(query.trim());
    return source.filter(
      (place) =>
        (!term ||
          normalize(
            `${place.name} ${place.address} ${place.category}`,
          ).includes(term)) &&
        (category === "Todos" || place.category === category),
    );
  }, [allPlaces, category, favorites, query, recents, tab]);
  const errors = formErrors(form);
  const isFavorite = (place) =>
    favorites.some((favorite) => locationKey(favorite) === locationKey(place));
  const storeFavorites = (next) => {
    setFavorites(next);
    if (!writeStorage(favoriteKey, next)) setStorageError(true);
  };
  const storeRecents = (next) => {
    setRecents(next);
    if (!writeStorage(recentKey, next)) setStorageError(true);
  };
  const toggleFavorite = (place) => {
    const saved = isFavorite(place);
    storeFavorites(
      saved
        ? favorites.filter((item) => locationKey(item) !== locationKey(place))
        : [place, ...favorites],
    );
    setFeedback(
      saved
        ? `${place.name} removido dos favoritos.`
        : `${place.name} salvo nos favoritos.`,
    );
  };
  const openPlaceForm = (place = null) => {
    setEditing(place);
    setForm(
      place
        ? {
            name: place.name,
            address: place.address,
            lat: Number.isFinite(place.lat) ? String(place.lat) : "",
            lng: Number.isFinite(place.lng) ? String(place.lng) : "",
          }
        : emptyForm,
    );
    setTouched({});
    setSubmitted(false);
    setModalOpen(true);
  };
  const selectPlace = (place) => {
    if (!validCoordinates(place)) {
      openPlaceForm(place);
      return;
    }
    storeRecents(
      [
        place,
        ...recents.filter((item) => locationKey(item) !== locationKey(place)),
      ].slice(0, 12),
    );
    const destination = locations.some((item) => item.id === place.id)
      ? place.id
      : `${place.lat},${place.lng}`;
    navigate(`/directions?${new URLSearchParams({ to: destination })}`);
  };
  const savePlace = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        document.getElementById(`place-${Object.keys(errors)[0]}`)?.focus(),
      );
      return;
    }
    const place = {
      id: editing?.id || `place-${Date.now()}`,
      name: form.name.trim(),
      address: form.address.trim(),
      lat: parseCoordinate(form.lat),
      lng: parseCoordinate(form.lng),
      category: editing?.category || "Meus lugares",
    };
    const keep = (item) =>
      locationKey(item) !== locationKey(place) &&
      (!editing || locationKey(item) !== locationKey(editing));
    storeFavorites([place, ...favorites.filter(keep)]);
    storeRecents([place, ...recents.filter(keep)].slice(0, 12));
    setModalOpen(false);
    setFeedback(`${place.name} salvo. Seu destino está pronto para usar.`);
  };

  return (
    <div className="search-page">
      <PageHeading
        eyebrow="Explore São Paulo"
        title="Seu próximo destino."
        description="Encontre um lugar, salve seus favoritos e comece o caminho."
      >
        <span className="badge search-city-badge">
          <Icon name="pin" size={14} /> São Paulo, SP
        </span>
      </PageHeading>
      <div className="search-layout">
        <section className="search-main" aria-label="Busca de destinos">
          <div className="search-input-card card">
            <label htmlFor="destination-query" className="eyebrow">
              Para onde vamos?
            </label>
            <div className="search-field-wrap">
              <Icon name="search" size={22} />
              <input
                id="destination-query"
                className="input"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque um lugar ou endereço do catálogo"
              />
            </div>
            <p className="muted search-field-hint">
              Sugestões do nosso catálogo em São Paulo e dos seus locais salvos.
            </p>
          </div>
          <div
            className="search-tabs"
            role="group"
            aria-label="Mostrar destinos"
          >
            {[
              { id: "all", name: "Todos", icon: "pin" },
              { id: "favorites", name: "Favoritos", icon: "star" },
              { id: "recents", name: "Recentes", icon: "clock" },
            ].map((item) => (
              <button
                key={item.id}
                className={`search-tab ${tab === item.id ? "is-active" : ""}`}
                aria-pressed={tab === item.id}
                onClick={() => {
                  setTab(item.id);
                  setCategory("Todos");
                }}
              >
                <Icon name={item.icon} size={17} /> {item.name}
                {item.id === "favorites" && favorites.length > 0 && (
                  <span className="search-tab-count">{favorites.length}</span>
                )}
              </button>
            ))}
          </div>
          {tab === "all" && (
            <div
              className="place-categories"
              role="group"
              aria-label="Categoria do destino"
            >
              {categories.map((item) => (
                <button
                  key={item}
                  className={`category-chip ${category === item ? "is-active" : ""}`}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          <div className="search-results-heading">
            <h2>
              {query
                ? "Resultados da busca"
                : tab === "favorites"
                  ? "Seus lugares favoritos"
                  : tab === "recents"
                    ? "Por onde você passou"
                    : "Lugares para descobrir"}
            </h2>
            <span className="muted" role="status" aria-live="polite">
              {results.length} {results.length === 1 ? "lugar" : "lugares"}
            </span>
          </div>
          <div className="card search-results-card">
            {results.length ? (
              results.map((place) => (
                <PlaceRow
                  key={locationKey(place)}
                  place={place}
                  recent={tab === "recents"}
                  saved={isFavorite(place)}
                  onSelect={selectPlace}
                  onFavorite={toggleFavorite}
                />
              ))
            ) : (
              <EmptyState
                icon={query ? "search" : tab === "favorites" ? "star" : "clock"}
                title={
                  query
                    ? "Não encontramos esse lugar"
                    : tab === "favorites"
                      ? "Seus favoritos começam aqui"
                      : "Seu próximo caminho aparece aqui"
                }
                description={
                  query
                    ? "Tente outro nome ou salve um endereço usando suas coordenadas."
                    : tab === "favorites"
                      ? "Toque na estrela de um destino para deixá-lo sempre por perto."
                      : "Os lugares que você escolher ficam salvos para a próxima viagem."
                }
              >
                {query ? (
                  <button
                    className="button button-secondary"
                    onClick={() => openPlaceForm()}
                  >
                    Adicionar local
                  </button>
                ) : (
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setTab("all");
                      setCategory("Todos");
                    }}
                  >
                    Explorar destinos <Icon name="arrow-right" size={16} />
                  </button>
                )}
              </EmptyState>
            )}
          </div>
          <div className="search-feedback" aria-live="polite" role="status">
            {feedback && (
              <span className="status-message success">
                <Icon name="check" size={16} /> {feedback}
              </span>
            )}
            {storageError && (
              <span className="status-message error">
                <Icon name="alert" size={16} /> Seu navegador não permitiu
                salvar os lugares. As alterações ficam disponíveis nesta sessão.
              </span>
            )}
          </div>
        </section>
        <aside className="search-sidebar">
          <div className="search-discovery-card card">
            <span className="eyebrow">O caminho é seu</span>
            <div className="search-route-art" aria-hidden="true">
              <span className="route-art-line" />
              <span className="route-art-stop route-art-start">
                <Icon name="home" size={23} />
              </span>
              <span className="route-art-bus">
                <Icon name="bus" size={28} />
              </span>
              <span className="route-art-stop route-art-end">
                <Icon name="pin" size={25} />
              </span>
            </div>
            <h2>
              A cidade tem
              <br />
              muito para oferecer.
            </h2>
            <p className="muted">
              Do trajeto de todo dia ao passeio de fim de semana. Guarde os
              lugares que fazem parte da sua São Paulo.
            </p>
            <button
              className="button button-primary"
              onClick={() => openPlaceForm()}
            >
              <Icon name="plus" size={18} /> Adicionar meu lugar
            </button>
          </div>
          <div className="card search-shortcuts">
            <h2>Outros caminhos</h2>
            <Link to="/lines" className="search-shortcut">
              <span className="shortcut-icon">
                <Icon name="bus" size={19} />
              </span>
              <span>
                <strong>Encontre sua linha</strong>
                <small>Consulte os ônibus da cidade</small>
              </span>
              <Icon name="chevron-right" size={18} />
            </Link>
            <Link to="/stations" className="search-shortcut">
              <span className="shortcut-icon">
                <Icon name="map" size={19} />
              </span>
              <span>
                <strong>Explore no mapa</strong>
                <small>Visualize trajetos pela cidade</small>
              </span>
              <Icon name="chevron-right" size={18} />
            </Link>
          </div>
          <p className="search-local-note">
            <Icon name="lock" size={15} /> Seus lugares ficam salvos neste
            navegador.
          </p>
        </aside>
      </div>
      {modalOpen && (
        <Modal
          title={editing ? "Complete seu lugar" : "Um lugar para chamar de seu"}
          onClose={() => setModalOpen(false)}
        >
          <form className="place-form" onSubmit={savePlace} noValidate>
            <p className="muted">
              Dê um nome e informe a localização exata. Para endereços fora do
              catálogo, copie a latitude e a longitude de um aplicativo de
              mapas.
            </p>
            {[
              {
                key: "name",
                label: "Nome do lugar",
                placeholder: "Ex.: Casa, trabalho, café favorito",
                maxLength: 80,
              },
              {
                key: "address",
                label: "Endereço",
                placeholder: "Rua, número e bairro",
                maxLength: 180,
              },
            ].map((field) => (
              <div className="field" key={field.key}>
                <label htmlFor={`place-${field.key}`}>{field.label}</label>
                <input
                  id={`place-${field.key}`}
                  className="input"
                  value={form[field.key]}
                  required
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onBlur={() =>
                    setTouched((current) => ({ ...current, [field.key]: true }))
                  }
                  aria-invalid={Boolean(
                    (submitted || touched[field.key]) && errors[field.key],
                  )}
                  aria-describedby={
                    (submitted || touched[field.key]) && errors[field.key]
                      ? `place-${field.key}-error`
                      : undefined
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
                {(submitted || touched[field.key]) && errors[field.key] && (
                  <span
                    id={`place-${field.key}-error`}
                    className="field-error"
                    aria-live="polite"
                  >
                    {errors[field.key]}
                  </span>
                )}
              </div>
            ))}
            <div className="place-coordinate-fields">
              {[
                { key: "lat", label: "Latitude", placeholder: "Ex.: -23.5505" },
                {
                  key: "lng",
                  label: "Longitude",
                  placeholder: "Ex.: -46.6333",
                },
              ].map((field) => (
                <div className="field" key={field.key}>
                  <label htmlFor={`place-${field.key}`}>{field.label}</label>
                  <input
                    id={`place-${field.key}`}
                    className="input"
                    inputMode="decimal"
                    value={form[field.key]}
                    required
                    placeholder={field.placeholder}
                    onBlur={() =>
                      setTouched((current) => ({
                        ...current,
                        [field.key]: true,
                      }))
                    }
                    aria-invalid={Boolean(
                      (submitted || touched[field.key]) && errors[field.key],
                    )}
                    aria-describedby={
                      (submitted || touched[field.key]) && errors[field.key]
                        ? `place-${field.key}-error`
                        : "place-coordinates-help"
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                  {(submitted || touched[field.key]) && errors[field.key] && (
                    <span
                      id={`place-${field.key}-error`}
                      className="field-error"
                      aria-live="polite"
                    >
                      {errors[field.key]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="muted coordinate-help" id="place-coordinates-help">
              Use coordenadas decimais. A latitude vem primeiro; a longitude,
              depois.
            </p>
            <div className="place-form-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="button button-primary" type="submit">
                <Icon name="star" size={17} /> Salvar lugar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
