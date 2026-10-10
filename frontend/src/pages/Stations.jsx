import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LocationInput from "../components/LocationInput.jsx";
import TransitMap from "../components/TransitMap.jsx";
import { Icon, PageHeading } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { locations, normalize, resolveLocation } from "../lib/locations.js";
import "../styles/stations.css";

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

function locationLabel(value) {
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

function StationPlanner({
  initialFrom,
  initialTo,
  fromName,
  toName,
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
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [locationMessage, setLocationMessage] = useState("");
  const requestRef = useRef(null);
  const mountedRef = useRef(true);
  const autoStartedRef = useRef(false);
  const previewLocation = useMemo(
    () => resolvePlanLocation(origin, initialFrom, fromName, initialTo, toName),
    [origin, initialFrom, fromName, initialTo, toName],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

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

  const calculateRoute = useCallback(
    async (event) => {
      event?.preventDefault();
      const from = resolvePlanLocation(
        origin,
        initialFrom,
        fromName,
        initialTo,
        toName,
      );
      const to = resolvePlanLocation(
        destination,
        initialFrom,
        fromName,
        initialTo,
        toName,
      );
      if (!from || !to) {
        setFieldErrors({
          origin: !from
            ? "Selecione uma partida nas sugestões ou informe latitude, longitude."
            : "",
          destination: !to
            ? "Selecione um destino nas sugestões ou informe latitude, longitude."
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
        setError(
          "A partida e o destino são iguais. Escolha outro local para ver um trajeto.",
        );
        return;
      }
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setError("");
      setFieldErrors({});
      setRoute(null);
      setLoading(true);
      try {
        const params = new URLSearchParams({
          point1: `${from.lat},${from.lng}`,
          point2: `${to.lat},${to.lng}`,
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
        setRoute({
          coordinates,
          from,
          to,
          distance: path.distance == null ? NaN : Number(path.distance),
          duration: path.time == null ? NaN : Number(path.time),
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
    [origin, destination, initialFrom, initialTo, fromName, toName],
  );

  useEffect(() => {
    if (!autoPlan || autoStartedRef.current) return;
    // Defer one task so StrictMode's trial mount can cancel before any request.
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
      ({ coords }) => {
        if (!mountedRef.current) return;
        changeOrigin(
          `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`,
        );
        setLocating(false);
        setLocationMessage("Localização atual definida como partida.");
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

  return (
    <>
      <PageHeading
        eyebrow="EXPLORE SÃO PAULO"
        title="Seu caminho, no mapa."
        description="Escolha a partida e o destino para visualizar um trajeto pela cidade."
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
            <form
              onSubmit={calculateRoute}
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
                  placeholder="Busque um local de partida"
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
                  placeholder="Busque seu destino"
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
                Selecione um local nas sugestões ou cole latitude e longitude.
              </p>
            </form>
          </section>

          {route ? (
            <section
              className="card stations-result"
              aria-labelledby="route-summary-title"
              aria-live="polite"
            >
              <span className="badge">Trajeto viário</span>
              <h2 id="route-summary-title">Seu trajeto está pronto</h2>
              <div className="stations-metrics">
                <div>
                  <strong>{distanceLabel(route.distance)}</strong>
                  <span className="muted">Distância pela via</span>
                </div>
                <div>
                  <strong>{durationLabel(route.duration)}</strong>
                  <span className="muted">Referência de carro</span>
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
              <p className="stations-route-disclaimer">
                Calculado para automóveis. A duração não representa tempo de
                espera, horário ou previsão de ônibus.
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
                {locations.slice(0, 3).map((place) => (
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
            </span>
            <span className="stations-map-source muted">OpenStreetMap</span>
          </div>
          <TransitMap route={route} focusLocation={previewLocation} />
          <div className="stations-map-footer">
            <span className="stations-map-legend">
              <span className="stations-legend-dot" aria-hidden="true" />
              {route
                ? "Trajeto viário calculado"
                : previewLocation
                  ? "Local selecionado no mapa"
                  : "Explore antes de sair"}
            </span>
            <span className="muted">
              Use + / − e as setas com o mapa em foco.
            </span>
          </div>
        </section>
      </div>

      <p className="stations-page-note muted">
        <Icon name="route" size={17} /> Este mapa mostra trajetos viários. Para
        consultar os dados atuais dos ônibus, acesse a página Linhas.
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
  const autoPlan = searchParams.get("plan") === "1";
  // Remount when another page opens a different pair of locations on this route.
  return (
    <StationPlanner
      key={JSON.stringify([from, to, fromName, toName, autoPlan])}
      initialFrom={from}
      initialTo={to}
      fromName={fromName}
      toName={toName}
      autoPlan={autoPlan}
    />
  );
}
