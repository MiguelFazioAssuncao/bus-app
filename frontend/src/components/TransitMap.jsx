import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui.jsx";

let leafletPromise;
const ASSETS = {
  style: {
    url: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
  },
  script: {
    url: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    integrity: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
  },
};

function loadAsset(kind) {
  const asset = ASSETS[kind];
  const id = `bus-app-leaflet-${kind}`;
  const existing = document.getElementById(id);
  if (
    existing?.dataset.loaded === "true" ||
    (kind === "script" && window.L) ||
    (kind === "style" && existing?.sheet)
  )
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const element =
      existing || document.createElement(kind === "style" ? "link" : "script");
    element.id = id;
    let timer;
    function cleanup() {
      clearTimeout(timer);
      element.removeEventListener("load", onLoad);
      element.removeEventListener("error", onError);
    }
    function onLoad() {
      cleanup();
      element.dataset.loaded = "true";
      resolve();
    }
    function onError() {
      cleanup();
      element.remove();
      reject(new Error("Não foi possível carregar o mapa."));
    }
    element.addEventListener("load", onLoad, { once: true });
    element.addEventListener("error", onError, { once: true });
    timer = setTimeout(onError, 12000);
    if (!existing) {
      element.crossOrigin = "anonymous";
      element.integrity = asset.integrity;
      if (kind === "style") {
        element.rel = "stylesheet";
        element.href = asset.url;
      } else {
        element.src = asset.url;
        element.async = true;
      }
      document.head.appendChild(element);
    }
  });
}

function loadLeaflet() {
  // Keep successful assets across navigation; concurrent mounts share one load.
  if (!leafletPromise) {
    leafletPromise = Promise.all([loadAsset("style"), loadAsset("script")])
      .then(() => {
        if (!window.L?.map) throw new Error("O mapa não ficou disponível.");
        return window.L;
      })
      .catch((error) => {
        leafletPromise = null;
        throw error;
      });
  }
  return leafletPromise;
}

function popupContent(label, place) {
  const element = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${label}: ${place.name}`;
  element.appendChild(title);
  if (place.address) {
    const address = document.createElement("p");
    address.textContent = place.address;
    element.appendChild(address);
  }
  return element;
}

function addPlaceMarker(L, group, letter, label, place) {
  const icon = L.divIcon({
    className: "transit-marker",
    html: `<span class="transit-marker-dot transit-marker-${letter.toLowerCase()}">${letter}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
  return L.marker([place.lat, place.lng], {
    icon,
    title: `${label}: ${place.name}`,
    alt: `${label}: ${place.name}`,
    keyboard: true,
  })
    .bindPopup(popupContent(label, place))
    .addTo(group);
}

export default function TransitMap({ route, focusLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [phase, setPhase] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    let disposed = false;
    let map;
    let observer;
    let tileTimer;
    let loadedTiles = 0;
    let failedTiles = 0;
    const showError = () => {
      if (!disposed && loadedTiles === 0) setPhase("error");
    };
    loadLeaflet()
      .then((L) => {
        if (disposed || !containerRef.current) return;
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        map = L.map(containerRef.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          zoomAnimation: !reducedMotion,
          fadeAnimation: !reducedMotion,
          markerZoomAnimation: !reducedMotion,
          inertia: !reducedMotion,
        }).setView([-23.55052, -46.633308], 13);
        L.control
          .zoom({
            position: "bottomright",
            zoomInTitle: "Aproximar mapa",
            zoomOutTitle: "Afastar mapa",
          })
          .addTo(map);
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        );
        tiles.on("tileload", () => {
          loadedTiles += 1;
          clearTimeout(tileTimer);
          if (!disposed) setPhase("ready");
        });
        tiles.on("tileerror", () => {
          failedTiles += 1;
        });
        tiles.on("load", () => {
          if (failedTiles) showError();
        });
        tiles.addTo(map);
        tileTimer = setTimeout(showError, 12000);
        mapRef.current = { L, map };
        setMapVersion((version) => version + 1);
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => {
            if (!disposed) map.invalidateSize({ animate: false });
          });
          observer.observe(containerRef.current);
        }
        map.invalidateSize({ animate: false });
      })
      .catch(showError);
    return () => {
      disposed = true;
      clearTimeout(tileTimer);
      observer?.disconnect();
      if (map) {
        if (mapRef.current?.map === map) mapRef.current = null;
        map.remove();
      }
    };
  }, [attempt]);

  useEffect(() => {
    const current = mapRef.current;
    if (!current) return;
    const { L, map } = current;
    if (!route && !focusLocation) {
      map.setView([-23.55052, -46.633308], 13, { animate: false });
      return;
    }
    const group = L.layerGroup().addTo(map);
    if (route) {
      const path = L.polyline(route.coordinates, {
        color: "#F58D35",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
      }).addTo(group);
      addPlaceMarker(L, group, "A", "Partida", route.from);
      addPlaceMarker(L, group, "B", "Destino", route.to);
      map.fitBounds(path.getBounds(), {
        padding: [48, 48],
        maxZoom: 16,
        animate: false,
      });
    } else {
      addPlaceMarker(L, group, "A", "Local selecionado", focusLocation);
      map.setView([focusLocation.lat, focusLocation.lng], 16, {
        animate: false,
      });
    }
    return () => {
      if (mapRef.current?.map === map) map.removeLayer(group);
    };
  }, [route, focusLocation, mapVersion]);

  function retryMap() {
    setPhase("loading");
    setAttempt((current) => current + 1);
  }

  return (
    <div className={`transit-map transit-map-${phase}`}>
      <div
        ref={containerRef}
        className="transit-map-canvas"
        role="region"
        aria-label="Mapa interativo de São Paulo. Use as setas para mover e mais ou menos para ampliar."
        aria-busy={phase === "loading"}
        inert={phase !== "ready"}
      />
      <span className="transit-map-city-label" aria-hidden="true">
        <span /> São Paulo
      </span>
      {phase !== "ready" && (
        <div className="transit-map-fallback" role="status">
          <div className="transit-map-fallback-icon" aria-hidden="true">
            <Icon name="pin" size={32} />
          </div>
          <h3>
            {phase === "error"
              ? "O mapa não carregou"
              : "Abrindo o mapa da cidade"}
          </h3>
          <p className="muted">
            {phase === "error"
              ? "Verifique sua conexão e tente novamente. Os campos do trajeto continuam disponíveis."
              : "Estamos carregando o mapa de São Paulo pelo OpenStreetMap."}
          </p>
          {phase === "error" ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={retryMap}
            >
              <Icon name="refresh" size={17} /> Tentar novamente
            </button>
          ) : (
            <span className="transit-map-loading" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
