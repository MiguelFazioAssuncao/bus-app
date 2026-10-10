import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import LocationInput from "../components/LocationInput.jsx";
import CityIllustration from "../components/CityIllustration.jsx";
import { Icon, Modal } from "../components/ui.jsx";
import { locations, resolveLocation } from "../lib/locations.js";
import { readStorage, writeStorage, userKey } from "../lib/storage.js";
import useReveal from "../lib/useReveal.js";

function initialPlace(value) {
  const place = resolveLocation(value);
  return place
    ? place.name === "Local personalizado"
      ? `${place.lat},${place.lng}`
      : place.name
    : "";
}
export default function Directions() {
  const overview = useRef(null);
  useReveal(overview);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState(() => initialPlace(params.get("from")));
  const [destination, setDestination] = useState(() =>
    initialPlace(params.get("to")),
  );
  const [errors, setErrors] = useState({});
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(() => ({
    home: readStorage(userKey("homeInfo"), null),
    work: readStorage(userKey("workInfo"), null),
  }));
  const [editing, setEditing] = useState(null);
  const [savedName, setSavedName] = useState("");
  const [savedPlace, setSavedPlace] = useState("");
  const [saveError, setSaveError] = useState("");

  function plan(event) {
    event.preventDefault();
    const from = resolveLocation(origin),
      to = resolveLocation(destination);
    const next = {};
    if (!from)
      next.origin = "Escolha um local sugerido ou informe latitude,longitude.";
    if (!to)
      next.destination =
        "Escolha um local sugerido ou informe latitude,longitude.";
    if (from && to && from.lat === to.lat && from.lng === to.lng)
      next.destination = "Escolha um destino diferente do ponto de partida.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.origin ? "origin" : "destination")?.focus();
      return;
    }
    navigate(
      `/stations?${new URLSearchParams({ from: `${from.lat},${from.lng}`, to: `${to.lat},${to.lng}`, fromName: from.name, toName: to.name, plan: "1" })}`,
    );
  }
  function locate() {
    if (!navigator.geolocation) {
      setNotice(
        "Seu navegador não oferece localização. Escolha um local sugerido.",
      );
      return;
    }
    setLocating(true);
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin(
          `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`,
        );
        setErrors((previous) => ({ ...previous, origin: undefined }));
        setLocating(false);
        setNotice("Localização definida como ponto de partida.");
      },
      () => {
        setLocating(false);
        setNotice(
          "Não conseguimos acessar sua localização. Você pode escolher o ponto de partida manualmente.",
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  function openSaved(type) {
    setEditing(type);
    setSavedName(saved[type]?.name || (type === "home" ? "Casa" : "Trabalho"));
    const place = saved[type];
    setSavedPlace(place ? `${place.lat},${place.lng}` : "");
    setSaveError("");
  }
  function save(event) {
    event.preventDefault();
    const place = resolveLocation(savedPlace);
    if (!savedName.trim() || !place) {
      setSaveError(
        "Informe um nome e escolha um local sugerido ou coordenadas válidas.",
      );
      return;
    }
    const next = { ...place, name: savedName.trim(), id: `saved-${editing}` };
    if (!writeStorage(userKey(`${editing}Info`), next)) {
      setSaveError(
        "Não foi possível salvar neste navegador. Verifique se o armazenamento está permitido.",
      );
      return;
    }
    const favorites = readStorage(userKey("favorites"), []);
    writeStorage(userKey("favorites"), [
      next,
      ...(Array.isArray(favorites)
        ? favorites.filter((item) => item.id !== next.id)
        : []),
    ]);
    setSaved((previous) => ({ ...previous, [editing]: next }));
    setEditing(null);
    setNotice(`${next.name} salvo neste dispositivo.`);
  }
  return (
    <div className="overview-page" ref={overview}>
      <div className="overview-heading">
        <div>
          <p className="eyebrow">
            <span className="tiny-dot" /> VAMOS DE ÔNIBUS?
          </p>
          <h1>
            Menos espera.
            <br />
            <span>Mais cidade.</span>
          </h1>
          <p className="muted">
            Seu próximo destino começa com um caminho mais simples.
          </p>
        </div>
        <span className="overview-stamp">
          <Icon name="navigation" size={18} /> No seu tempo.
          <br />
          No seu ritmo.
        </span>
      </div>
      <div className="journey-layout">
        <section className="card planner-card" aria-labelledby="planner-title">
          <div className="section-topline">
            <span className="eyebrow">PLANEJE SEU CAMINHO</span>
            <span className="planner-icon">
              <Icon name="route" />
            </span>
          </div>
          <h2 id="planner-title">Para onde vamos?</h2>
          <p className="muted planner-description">
            Escolha os lugares. A gente conecta os pontos.
          </p>
          <form onSubmit={plan} noValidate>
            <div className="planner-fields">
              <LocationInput
                id="origin"
                label="Ponto de partida"
                value={origin}
                onChange={(value) => {
                  setOrigin(value);
                  setErrors((previous) => ({ ...previous, origin: undefined }));
                }}
                placeholder="De onde você vai sair?"
                error={errors.origin}
              />
              <button
                type="button"
                className="swap-button icon-button"
                aria-label="Inverter origem e destino"
                onClick={() => {
                  setOrigin(destination);
                  setDestination(origin);
                  setErrors({});
                }}
              >
                <Icon name="arrow-down-up" size={17} />
              </button>
              <LocationInput
                id="destination"
                label="Seu destino"
                value={destination}
                onChange={(value) => {
                  setDestination(value);
                  setErrors((previous) => ({
                    ...previous,
                    destination: undefined,
                  }));
                }}
                placeholder="Onde você quer chegar?"
                error={errors.destination}
              />
            </div>
            <button
              type="button"
              className="location-action"
              onClick={locate}
              disabled={locating}
            >
              <Icon name="navigation" size={15} />
              {locating
                ? "Buscando sua localização…"
                : "Usar minha localização"}
            </button>
            <button
              className="button button-primary planner-submit"
              type="submit"
            >
              Explorar trajeto <Icon name="arrow-right" size={19} />
            </button>
          </form>
          <div className="planner-footnote">
            <Icon name="info" size={15} />
            <span>
              Locais sugeridos de São Paulo. Você também pode usar coordenadas.
            </span>
          </div>
        </section>
        <CityIllustration />
      </div>
      {notice && (
        <p className="status-message" role="status">
          {notice}
        </p>
      )}
      <section
        className="saved-section"
        aria-labelledby="saved-title"
        data-reveal
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">MENOS PASSOS, MAIS PRATICIDADE</span>
            <h2 id="saved-title">Seus lugares, a um toque.</h2>
          </div>
          <Link className="text-link" to="/search">
            Ver favoritos <Icon name="arrow-up-right" size={17} />
          </Link>
        </div>
        <div className="saved-grid">
          {[
            { type: "home", label: "Casa", icon: "home" },
            { type: "work", label: "Trabalho", icon: "briefcase" },
          ].map((item) => (
            <article key={item.type} className="saved-card card">
              <span className={`saved-icon ${item.type}`}>
                <Icon name={item.icon} size={23} />
              </span>
              <div>
                <h3>{saved[item.type]?.name || item.label}</h3>
                <p className="muted">
                  {saved[item.type]
                    ? saved[item.type].address
                    : "Seu destino de todo dia"}
                </p>
              </div>
              <div className="saved-actions">
                {saved[item.type] && (
                  <button
                    className="icon-button"
                    aria-label={`Usar ${saved[item.type].name} como destino`}
                    onClick={() => {
                      setDestination(saved[item.type].name);
                      document.getElementById("origin")?.focus();
                    }}
                  >
                    <Icon name="arrow-right" size={18} />
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`${saved[item.type] ? "Editar" : "Adicionar"} ${item.label}`}
                  onClick={() => openSaved(item.type)}
                >
                  <Icon
                    name={saved[item.type] ? "settings" : "plus"}
                    size={18}
                  />
                </button>
              </div>
            </article>
          ))}
          <Link to="/search" className="saved-card add-place-card">
            <span className="saved-icon">
              <Icon name="plus" size={23} />
            </span>
            <div>
              <h3>Um novo favorito</h3>
              <p className="muted">Guarde um lugar especial</p>
            </div>
            <Icon name="arrow-up-right" size={18} />
          </Link>
        </div>
      </section>
      <section
        className="discovery-section"
        aria-labelledby="discovery-title"
        data-reveal
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">SAIA DA ROTINA</span>
            <h2 id="discovery-title">Tem uma cidade lá fora.</h2>
          </div>
          <Link className="text-link" to="/search">
            Explorar lugares <Icon name="arrow-up-right" size={17} />
          </Link>
        </div>
        <div className="discovery-grid">
          {[
            {
              id: "masp",
              icon: "map",
              label: "Um pouco de cultura",
              className: "culture",
            },
            {
              id: "ibirapuera",
              icon: "leaf",
              label: "Uma pausa ao ar livre",
              className: "nature",
            },
            {
              id: "luz",
              icon: "train",
              label: "Novos caminhos",
              className: "connection",
            },
          ].map((item) => {
            const place = locations.find((entry) => entry.id === item.id);
            return (
              <button
                className={`discovery-card ${item.className}`}
                key={item.id}
                onClick={() => {
                  setDestination(place.name);
                  document.getElementById("origin")?.focus();
                }}
              >
                <div className="discovery-art">
                  <Icon name={item.icon} size={48} />
                  <span className="discovery-orbit" />
                  <span className="discovery-orbit second" />
                </div>
                <div>
                  <small>{item.label}</small>
                  <h3>{place.name}</h3>
                  <span>
                    Escolher destino <Icon name="arrow-up-right" size={15} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <Link to="/lines" className="transit-banner">
        <span className="transit-banner-icon">
          <Icon name="bus" size={27} />
        </span>
        <div>
          <h3>Seu ônibus, mais perto.</h3>
          <p>
            Consulte as linhas e acompanhe as posições disponíveis da SPTrans.
          </p>
        </div>
        <span className="button button-secondary">
          Consultar linhas <Icon name="arrow-right" size={18} />
        </span>
      </Link>
      {editing && (
        <Modal
          title={
            editing === "home"
              ? "Seu caminho para casa"
              : "Seu caminho para o trabalho"
          }
          onClose={() => setEditing(null)}
        >
          <p className="muted modal-description">
            Salve seu destino neste navegador para acessar com um toque.
          </p>
          <form onSubmit={save}>
            <div className="field">
              <label htmlFor="saved-name">Nome do lugar</label>
              <input
                id="saved-name"
                className="input"
                value={savedName}
                maxLength={80}
                onChange={(event) => setSavedName(event.target.value)}
                required
              />
            </div>
            <LocationInput
              label="Local"
              id="saved-place"
              value={savedPlace}
              onChange={setSavedPlace}
            />
            {saveError && (
              <p role="alert" className="status-message error">
                {saveError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="button button-primary">
                Salvar lugar <Icon name="check" size={17} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
