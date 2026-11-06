import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LocationInput from "../components/LocationInput.jsx";
import TransitMap from "../components/TransitMap.jsx";
import { Icon, PageHeading } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import {
  locations,
  normalize,
  rememberGeocodedPlaces,
  resolveLocation,
  reverseGeocodeCoordinates,
  searchAddressSuggestions,
} from "../lib/locations.js";
import "../styles/stations.css";

const PROFILE_OPTIONS = [
  { id: "car", label: "Carro", unitLabel: "Referência viária" },
  { id: "foot", label: "A pé", unitLabel: "Caminhada estimada" },
  { id: "bike", label: "Bicicleta", unitLabel: "Ciclovia / via" },
];

// GraphHopper returns either an encoded polyline or GeoJSON [longitude, latitude].
function routeCoordinates(path) {
  let coordinates;
  if (typeof path.points === "string") {
    const encoded = path.points;
    const multiplier = Number(path.points_encoded_multiplier) || 100000;
    const dimensions = path.points_dimension === 3 ? 3 : 2;
    const previous = Array(dimensions).fill(0);
    coordinates = [];
    let cursor = 0;
    while (cursor < encoded.length) {
      for (let dimension = 0; dimension < dimensions; dimension += 1) {
        let result = 0;
        let shift = 0;
        let value;
        do {
          if (cursor >= encoded.length || shift > 30)
            throw new Error(
              "O serviço retornou um trajeto inválido. Tente novamente.",
            );
          value = encoded.charCodeAt(cursor++) - 63;
          if (value < 0 || value > 63)
            throw new Error(
              "O serviço retornou um trajeto inválido. Tente novamente.",
            );
          result |= (value & 31) << shift;
          shift += 5;
        } while (value >= 32);
        previous[dimension] += result & 1 ? ~(result >> 1) : result >> 1;
      }
      coordinates.push([previous[0] / multiplier, previous[1] / multiplier]);
    }
  } else {
    const geometry = path.points?.geometry || path.points;
    coordinates = geometry?.coordinates?.map(([lng, lat]) => [lat, lng]);
  }
  if (
    !coordinates?.length ||
    coordinates.some(
      ([lat, lng]) =>
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180,
    )
  ) {
    throw new Error(
      "Não foi possível desenhar esse trajeto. Escolha outros locais ou tente novamente.",
    );
  }
  return coordinates;
}

function distanceLabel(meters) {
  if (!Number.isFinite(meters) || meters < 0) return "Indisponível";
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

function durationLabel(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "Indisponível";
  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}

function busEstimateLabel(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return "—";
  // Urban bus average speed ~16 km/h (4.4 m/s) + 5 min average wait/boarding
  const minutes = Math.max(4, Math.round(distanceMeters / 265 + 4));
  return minutes < 60
    ? `~${minutes} min`
    : `~${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function locationLabel(value) {
  if (!value) return "";
  if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(value.trim()))
    return value;
  const place = resolveLocation(value);
  return place?.name || place?.title || value;
}

function resolvePlanLocation(value, initialFrom, fromName, initialTo, toName) {
  const from = resolveLocation(initialFrom);
  const to = resolveLocation(initialTo);
  if (fromName && from && normalize(value) === normalize(fromName))
    return { ...from, name: fromName };
  if (toName && to && normalize(value) === normalize(toName))
    return { ...to, name: toName };
  const place = resolveLocation(value);
  if (!place) return null;
  const samePoint = (other) =>
    other &&
    Number(place.lat) === Number(other.lat) &&
    Number(place.lng) === Number(other.lng);
  return {
    ...place,
    name:
      samePoint(from) && fromName
        ? fromName
        : samePoint(to) && toName
          ? toName
          : place.name || place.title || "Local personalizado",
  };
}

function extractVehiclesFromSnapshot(data, filterCl, filterLineCode) {
  if (!data || !Array.isArray(data.l)) return [];
  const list = [];
  for (const line of data.l) {
    if (!line || typeof line !== "object") continue;
    if (filterCl && String(line.cl) !== String(filterCl)) continue;
    if (
      !filterCl &&
      filterLineCode &&
      normalize(line.c) !== normalize(filterLineCode)
    )
      continue;
    const vs = Array.isArray(line.vs) ? line.vs : [];
    for (const v of vs) {
      const lat = Number(v?.py);
      const lng = Number(v?.px ?? v?.plg);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        list.push({
          prefix: String(v.p || "—"),
          accessible: Boolean(v.a),
          updatedAt: v.ta
            ? new Date(v.ta).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : data.hr || "",
          lat,
          lng,
          lineCode: String(line.c || ""),
          destination: String(line.lt0 || line.lt1 || ""),
        });
      }
    }
    if (list.length >= 40) break;
  }
  return list;
}

function StationPlanner({
  initialFrom,
  initialTo,
  fromName,
  toName,
  initialLineCode,
  initialCl,
  autoPlan,
}) {
  const distinctNames = normalize(fromName) !== normalize(toName);
  const [origin, setOrigin] = useState(() =>
    fromName && distinctNames && resolveLocation(initialFrom)
      ? fromName
      : locationLabel(initialFrom),
  );
  const [destination, setDestination] = useState(() =>
    toName && distinctNames && resolveLocation(initialTo)
      ? toName
      : locationLabel(initialTo),
  );
  const [profile, setProfile] = useState("car");
  const [mapClickTarget, setMapClickTarget] = useState("destination");
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [locationMessage, setLocationMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [busOverlayLine, setBusOverlayLine] = useState(initialLineCode || "");
  const [busOverlayCl, setBusOverlayCl] = useState(initialCl || "");
  const [busVehicles, setBusVehicles] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(false);

  const requestRef = useRef(null);
  const mountedRef = useRef(true);
  const autoStartedRef = useRef(false);

  const previewLocation = useMemo(
    () =>
      resolvePlanLocation(origin, initialFrom, fromName, initialTo, toName) ||
      resolvePlanLocation(destination, initialFrom, fromName, initialTo, toName),
    [origin, destination, initialFrom, fromName, initialTo, toName],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  const loadLiveBuses = useCallback(async (cl, lineCode) => {
    setLoadingBuses(true);
    try {
      const params = new URLSearchParams();
      if (cl) params.set("cl", cl);
      else if (lineCode) params.set("code", lineCode);
      const queryStr = params.toString();
      const data = await api(`/lines/positions${queryStr ? `?${queryStr}` : ""}`);
      if (!mountedRef.current) return;
      setBusVehicles(extractVehiclesFromSnapshot(data, cl, lineCode));
    } catch {
      if (mountedRef.current) setBusVehicles([]);
    } finally {
      if (mountedRef.current) setLoadingBuses(false);
    }
  }, []);

  useEffect(() => {
    if (busOverlayCl || busOverlayLine) {
      loadLiveBuses(busOverlayCl, busOverlayLine);
    }
  }, [busOverlayCl, busOverlayLine, loadLiveBuses]);

  function clearRoute() {
    requestRef.current?.abort();
    setRoute(null);
    setLoading(false);
    setError("");
    setFieldErrors({});
  }

  function changeOrigin(value) {
    clearRoute();
    setOrigin(value);
    setLocationMessage("");
  }

  function changeDestination(value) {
    clearRoute();
    setDestination(value);
  }

  const resolveOrGeocode = useCallback(
    async (value, signal) => {
      const direct = resolvePlanLocation(
        value,
        initialFrom,
        fromName,
        initialTo,
        toName,
      );
      if (direct) return direct;
      const suggestions = await searchAddressSuggestions(value, signal);
      if (suggestions.length > 0) {
        rememberGeocodedPlaces(suggestions);
        return suggestions[0];
      }
      return null;
    },
    [initialFrom, fromName, initialTo, toName],
  );

  const calculateRoute = useCallback(
    async (event, overrideProfile) => {
      event?.preventDefault();
      const activeProfile = overrideProfile || profile;

      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setError("");
      setFieldErrors({});
      setLoading(true);

      try {
        const [from, to] = await Promise.all([
          resolveOrGeocode(origin, controller.signal),
          resolveOrGeocode(destination, controller.signal),
        ]);
        if (controller.signal.aborted) return;

        if (!from || !to) {
          setLoading(false);
          setFieldErrors({
            origin: !from
              ? "Selecione uma partida nas sugestões ou informe um endereço válido."
              : "",
            destination: !to
              ? "Selecione um destino nas sugestões ou informe um endereço válido."
              : "",
          });
          setError("Confira os locais antes de calcular o trajeto.");
          document
            .getElementById(!from ? "route-origin" : "route-destination")
            ?.focus();
          return;
        }
        if (
          Number(from.lat) === Number(to.lat) &&
          Number(from.lng) === Number(to.lng)
        ) {
          setLoading(false);
          setError(
            "A partida e o destino são iguais. Escolha outro local para ver um trajeto.",
          );
          return;
        }

        const params = new URLSearchParams({
          point1: `${from.lat},${from.lng}`,
          point2: `${to.lat},${to.lng}`,
          profile: activeProfile,
        });
        const data = await api(`/stations/route?${params}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const path = data?.paths?.[0];
        if (!path)
          throw new Error(
            "Nenhum trajeto foi encontrado entre esses locais. Tente outra partida ou destino.",
          );
        const coordinates = routeCoordinates(path);
        const instructions = Array.isArray(path.instructions)
          ? path.instructions.filter((step) => step && step.text)
          : [];
        setRoute({
          coordinates,
          from,
          to,
          profile: activeProfile,
          distance: path.distance == null ? NaN : Number(path.distance),
          duration: path.time == null ? NaN : Number(path.time),
          instructions,
        });
      } catch (requestError) {
        if (!controller.signal.aborted)
          setError(
            requestError.message ||
              "Não foi possível calcular o trajeto. Tente novamente.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [origin, destination, profile, resolveOrGeocode],
  );

  useEffect(() => {
    if (!autoPlan || autoStartedRef.current) return;
    const timer = setTimeout(() => {
      autoStartedRef.current = true;
      void calculateRoute();
    }, 0);
    return () => clearTimeout(timer);
  }, [autoPlan, calculateRoute]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Seu navegador não oferece localização. Escolha um local nas sugestões.",
      );
      return;
    }
    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (!mountedRef.current) return;
        const coordString = `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
        changeOrigin(coordString);
        setLocating(false);
        setLocationMessage("Localização atual definida como partida.");
        const place = await reverseGeocodeCoordinates(
          coords.latitude,
          coords.longitude,
        );
        if (mountedRef.current && place?.name && place.name !== "Localização selecionada") {
          setOrigin(place.name);
          setLocationMessage(`Partida definida: ${place.name}`);
        }
      },
      (locationError) => {
        if (!mountedRef.current) return;
        setLocating(false);
        setLocationMessage(
          locationError.code === 1
            ? "A localização não foi autorizada. Você pode escolher a partida nas sugestões."
            : "Não foi possível obter sua localização. Escolha um local ou tente novamente.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function handleMapClick({ lat, lng }) {
    const coordStr = `${lat},${lng}`;
    if (mapClickTarget === "origin") {
      changeOrigin(coordStr);
      setLocationMessage("Buscando endereço do ponto A selecionado no mapa…");
      const place = await reverseGeocodeCoordinates(lat, lng);
      if (!mountedRef.current) return;
      if (place?.name) {
        setOrigin(place.name);
        setLocationMessage(`Partida (A) definida no mapa: ${place.name}`);
      }
      setMapClickTarget("destination");
    } else {
      changeDestination(coordStr);
      setLocationMessage("Buscando endereço do ponto B selecionado no mapa…");
      const place = await reverseGeocodeCoordinates(lat, lng);
      if (!mountedRef.current) return;
      if (place?.name) {
        setDestination(place.name);
        setLocationMessage(`Destino (B) definida no mapa: ${place.name}`);
      }
    }
  }

  function copyShareLink() {
    if (!route) return;
    const url = new URL(window.location.href);
    url.searchParams.set("from", `${route.from.lat},${route.from.lng}`);
    url.searchParams.set("to", `${route.to.lat},${route.to.lng}`);
    url.searchParams.set("fromName", route.from.name);
    url.searchParams.set("toName", route.to.name);
    url.searchParams.set("plan", "1");
    navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  }

  const activeProfileMeta =
    PROFILE_OPTIONS.find((item) => item.id === (route?.profile || profile)) ||
    PROFILE_OPTIONS[0];

  return (
    <>
      <PageHeading
        eyebrow="EXPLORE SÃO PAULO"
        title="Seu caminho, no mapa."
        description="Escolha ou clique no mapa para definir partida e destino, compare modos e veja ônibus em tempo real."
      >
        <span className="badge">
          <Icon name="pin" size={15} /> São Paulo, SP
        </span>
      </PageHeading>

      <div className="stations-workspace">
        <div className="stations-sidebar">
          <section
            className="card stations-planner"
            aria-labelledby="planner-title"
          >
            <div className="stations-card-heading">
              <span className="stations-icon-tile" aria-hidden="true">
                <Icon name="route" size={22} />
              </span>
              <div>
                <p className="eyebrow">DE UM PONTO A OUTRO</p>
                <h2 id="planner-title">Planejar trajeto</h2>
              </div>
            </div>
            <div
              className="stations-profile-selector"
              role="group"
              aria-label="Modo de deslocamento"
            >
              {PROFILE_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`stations-profile-btn ${profile === item.id ? "is-active" : ""}`}
                  aria-pressed={profile === item.id}
                  onClick={() => {
                    setProfile(item.id);
                    if (route) {
                      void calculateRoute(null, item.id);
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => calculateRoute(e)}
              className="stations-form"
              aria-busy={loading}
            >
              <div className="stations-route-field">
                <span
                  className="stations-point stations-point-origin"
                  aria-hidden="true"
                >
                  A
                </span>
                <LocationInput
                  id="route-origin"
                  label="De onde você sai?"
                  value={origin}
                  onChange={changeOrigin}
                  placeholder="Busque local, rua ou clique no mapa"
                  error={fieldErrors.origin}
                />
              </div>
              <button
                type="button"
                className="stations-current-location"
                onClick={useCurrentLocation}
                disabled={locating}
              >
                <Icon name="navigation" size={15} />{" "}
                {locating ? "Localizando…" : "Usar minha localização"}
              </button>
              {locationMessage && (
                <p className="stations-location-feedback muted" role="status">
                  {locationMessage}
                </p>
              )}
              <div className="stations-route-field">
                <span
                  className="stations-point stations-point-destination"
                  aria-hidden="true"
                >
                  B
                </span>
                <LocationInput
                  id="route-destination"
                  label="Para onde você vai?"
                  value={destination}
                  onChange={changeDestination}
                  placeholder="Busque destino, endereço ou clique no mapa"
                  error={fieldErrors.destination}
                />
              </div>
              <button
                type="button"
                className="stations-swap"
                onClick={() => {
                  clearRoute();
                  setOrigin(destination);
                  setDestination(origin);
                  setLocationMessage("");
                }}
                disabled={!origin && !destination}
              >
                <span aria-hidden="true">↕</span> Inverter partida e destino
              </button>
              {error && (
                <p className="status-message error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-primary stations-submit"
                type="submit"
                disabled={loading}
              >
                <Icon
                  name={loading ? "refresh" : "route"}
                  size={18}
                  className={loading ? "stations-spinning" : ""}
                />
                {loading ? "Calculando trajeto…" : "Ver trajeto no mapa"}
                {!loading && <Icon name="arrow-right" size={18} />}
              </button>
              <p className="stations-form-note muted">
                Busque qualquer endereço em São Paulo, escolha nas sugestões ou
                clique diretamente no mapa.
              </p>
            </form>
          </section>

          {route ? (
            <section
              className="card stations-result"
              aria-labelledby="route-summary-title"
              aria-live="polite"
            >
              <div className="stations-result-topline">
                <span className="badge">{activeProfileMeta.label}</span>
                <button
                  type="button"
                  className="stations-share-btn"
                  onClick={copyShareLink}
                >
                  <Icon name={copiedLink ? "check" : "arrow-up-right"} size={14} />
                  {copiedLink ? "Link copiado!" : "Compartilhar"}
                </button>
              </div>
              <h2 id="route-summary-title">Seu trajeto está pronto</h2>
              <div className="stations-metrics stations-metrics-three">
                <div>
                  <strong>{distanceLabel(route.distance)}</strong>
                  <span className="muted">Distância pela via</span>
                </div>
                <div>
                  <strong>{durationLabel(route.duration)}</strong>
                  <span className="muted">{activeProfileMeta.unitLabel}</span>
                </div>
                <div>
                  <strong>{busEstimateLabel(route.distance)}</strong>
                  <span className="muted">Estimativa de ônibus</span>
                </div>
              </div>
              <ol className="stations-itinerary">
                <li>
                  <span
                    className="stations-point stations-point-origin"
                    aria-hidden="true"
                  >
                    A
                  </span>
                  <div>
                    <span className="muted">Partida</span>
                    <strong>{route.from.name}</strong>
                    {route.from.address && (
                      <span className="muted">{route.from.address}</span>
                    )}
                  </div>
                </li>
                <li>
                  <span
                    className="stations-point stations-point-destination"
                    aria-hidden="true"
                  >
                    B
                  </span>
                  <div>
                    <span className="muted">Destino</span>
                    <strong>{route.to.name}</strong>
                    {route.to.address && (
                      <span className="muted">{route.to.address}</span>
                    )}
                  </div>
                </li>
              </ol>
              {route.instructions?.length > 0 && (
                <details className="stations-steps">
                  <summary>
                    Passo a passo do trajeto ({route.instructions.length}{" "}
                    etapas)
                  </summary>
                  <ol className="stations-steps-list">
                    {route.instructions.map((step, index) => (
                      <li key={index}>
                        <span>{step.text}</span>
                        {step.distance > 0 && (
                          <small>{distanceLabel(step.distance)}</small>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <p className="stations-route-disclaimer">
                A estimativa de ônibus considera velocidade média urbana e
                embarque. Para posições em tempo real da SPTrans, use o botão de
                ônibus no mapa ou a aba Linhas.
              </p>
            </section>
          ) : (
            <section
              className="card stations-places"
              aria-labelledby="places-title"
            >
              <p className="eyebrow">UM BOM PONTO DE PARTIDA</p>
              <h2 id="places-title">Lugares na cidade</h2>
              <p className="muted">
                Toque em um local para defini-lo como destino.
              </p>
              <div className="stations-place-list">
                {locations.slice(0, 5).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    className="stations-place"
                    onClick={() => changeDestination(place.name)}
                  >
                    <span className="stations-place-pin" aria-hidden="true">
                      <Icon name="pin" size={18} />
                    </span>
                    <span>
                      <strong>{place.name}</strong>
                      <span className="muted">{place.address}</span>
                    </span>
                    <Icon name="arrow-right" size={17} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <section
          className="card stations-map-card"
          aria-label="Mapa e informações do trajeto"
        >
          <div className="stations-map-heading">
            <span>
              <Icon name="pin" size={18} /> Mapa da cidade
              {busOverlayLine && (
                <span className="badge stations-line-badge">
                  <Icon name="bus" size={13} /> Linha {busOverlayLine} (
                  {busVehicles.length})
                </span>
              )}
            </span>
            <div className="stations-map-controls">
              <div
                className="stations-click-mode"
                role="group"
                aria-label="Clique no mapa para definir"
              >
                <span className="muted">Clique no mapa:</span>
                <button
                  type="button"
                  className={`stations-click-chip ${mapClickTarget === "origin" ? "is-active" : ""}`}
                  aria-pressed={mapClickTarget === "origin"}
                  onClick={() => setMapClickTarget("origin")}
                >
                  Partida A
                </button>
                <button
                  type="button"
                  className={`stations-click-chip ${mapClickTarget === "destination" ? "is-active" : ""}`}
                  aria-pressed={mapClickTarget === "destination"}
                  onClick={() => setMapClickTarget("destination")}
                >
                  Destino B
                </button>
              </div>
              <button
                type="button"
                className={`stations-bus-toggle ${busVehicles.length > 0 ? "is-active" : ""}`}
                disabled={loadingBuses}
                onClick={() => {
                  if (busVehicles.length > 0) {
                    setBusVehicles([]);
                    setBusOverlayLine("");
                    setBusOverlayCl("");
                  } else {
                    loadLiveBuses(busOverlayCl, busOverlayLine);
                  }
                }}
              >
                <Icon
                  name={loadingBuses ? "refresh" : "bus"}
                  size={14}
                  className={loadingBuses ? "stations-spinning" : ""}
                />
                {busVehicles.length > 0
                  ? `Ocultar ônibus (${busVehicles.length})`
                  : "Ônibus ao vivo"}
              </button>
            </div>
          </div>
          <TransitMap
            route={route}
            focusLocation={previewLocation}
            vehicles={busVehicles}
            onMapClick={handleMapClick}
          />
          <div className="stations-map-footer">
            <span className="stations-map-legend">
              <span className="stations-legend-dot" aria-hidden="true" />
              {route
                ? "Trajeto calculado"
                : busVehicles.length > 0
                  ? `${busVehicles.length} veículos da SPTrans no mapa`
                  : previewLocation
                    ? "Local selecionado no mapa"
                    : "Clique no mapa para marcar um ponto"}
            </span>
            <span className="muted">
              Use + / − para zoom ou toque no mapa para escolher o local.
            </span>
          </div>
        </section>
      </div>

      <p className="stations-page-note muted">
        <Icon name="route" size={17} /> Você pode buscar endereços de São Paulo,
        comparar modos (carro, a pé e bicicleta) e visualizar veículos da SPTrans
        diretamente no mapa.
      </p>
    </>
  );
}

export default function Stations() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const fromName = searchParams.get("fromName") || "";
  const toName = searchParams.get("toName") || "";
  const lineCode = searchParams.get("line") || "";
  const cl = searchParams.get("cl") || "";
  const autoPlan = searchParams.get("plan") === "1";
  // Remount when another page opens a different pair of locations on this route.
  return (
    <StationPlanner
      key={JSON.stringify([from, to, fromName, toName, lineCode, cl, autoPlan])}
      initialFrom={from}
      initialTo={to}
      fromName={fromName}
      toName={toName}
      initialLineCode={lineCode}
      initialCl={cl}
      autoPlan={autoPlan}
    />
  );
}
