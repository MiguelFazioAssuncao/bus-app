import { readStorage, userKey } from "./storage.js";
import { api } from "./api.js";

// Curated São Paulo catalog of key terminals, stations, parks, and landmarks.
// Supplemented by live OpenStreetMap/Nominatim geocoding for any address in the city.
export const locations = [
  {
    id: "se",
    name: "Praça da Sé",
    address: "Sé · Centro de São Paulo",
    lat: -23.55052,
    lng: -46.633308,
    category: "Cidade",
  },
  {
    id: "masp",
    name: "MASP",
    address: "Av. Paulista, 1578 · Bela Vista",
    lat: -23.5614,
    lng: -46.6559,
    category: "Cultura",
  },
  {
    id: "ibirapuera",
    name: "Parque Ibirapuera",
    address: "Av. Pedro Álvares Cabral · Vila Mariana",
    lat: -23.5874,
    lng: -46.6576,
    category: "Ao ar livre",
  },
  {
    id: "luz",
    name: "Estação da Luz",
    address: "Praça da Luz · Bom Retiro",
    lat: -23.5361,
    lng: -46.6339,
    category: "Transporte",
  },
  {
    id: "pinacoteca",
    name: "Pinacoteca de São Paulo",
    address: "Praça da Luz, 2 · Luz",
    lat: -23.5344,
    lng: -46.6339,
    category: "Cultura",
  },
  {
    id: "barra-funda",
    name: "Terminal Barra Funda",
    address: "Av. Auro Soares de Moura Andrade · Barra Funda",
    lat: -23.5255,
    lng: -46.6675,
    category: "Transporte",
  },
  {
    id: "mercado",
    name: "Mercado Municipal",
    address: "R. da Cantareira, 306 · Centro",
    lat: -23.5419,
    lng: -46.6294,
    category: "Cidade",
  },
  {
    id: "liberdade",
    name: "Praça da Liberdade",
    address: "Liberdade · Centro de São Paulo",
    lat: -23.5552,
    lng: -46.6357,
    category: "Cidade",
  },
  {
    id: "pinheiros",
    name: "Terminal Pinheiros",
    address: "R. Gilberto Sabino · Pinheiros",
    lat: -23.5672,
    lng: -46.7019,
    category: "Transporte",
  },
  {
    id: "dom-pedro",
    name: "Terminal Parque Dom Pedro II",
    address: "Pq. Dom Pedro II · Centro",
    lat: -23.5499,
    lng: -46.6269,
    category: "Transporte",
  },
  {
    id: "santo-amaro",
    name: "Terminal Santo Amaro",
    address: "Av. Padre José Maria · Santo Amaro",
    lat: -23.6544,
    lng: -46.7108,
    category: "Transporte",
  },
  {
    id: "tiete",
    name: "Terminal Rodoviário Tietê",
    address: "Av. Cruzeiro do Sul, 1800 · Santana",
    lat: -23.5161,
    lng: -46.6251,
    category: "Transporte",
  },
  {
    id: "jabaquara",
    name: "Terminal Jabaquara",
    address: "R. Nelson Fernandes · Jabaquara",
    lat: -23.6462,
    lng: -46.641,
    category: "Transporte",
  },
  {
    id: "paulista",
    name: "Estação Paulista / Consolação",
    address: "Av. Paulista · Consolação",
    lat: -23.5558,
    lng: -46.6623,
    category: "Transporte",
  },
  {
    id: "villa-lobos",
    name: "Parque Villa-Lobos",
    address: "Av. Prof. Fonseca Rodrigues, 2001 · Alto de Pinheiros",
    lat: -23.5469,
    lng: -46.7236,
    category: "Ao ar livre",
  },
  {
    id: "usp",
    name: "USP · Cidade Universitária",
    address: "Av. Prof. Luciano Gualberto · Butantã",
    lat: -23.5614,
    lng: -46.7308,
    category: "Cidade",
  },
  {
    id: "congonhas",
    name: "Aeroporto de Congonhas",
    address: "Av. Washington Luís · Vila Congonhas",
    lat: -23.6261,
    lng: -46.6564,
    category: "Transporte",
  },
  {
    id: "sesc-pompeia",
    name: "Sesc Pompeia",
    address: "R. Clélia, 93 · Água Branca",
    lat: -23.5259,
    lng: -46.6831,
    category: "Cultura",
  },
];

const dynamicPlacesMap = new Map();

export function rememberGeocodedPlaces(places = []) {
  if (!Array.isArray(places)) return;
  for (const place of places) {
    if (
      place &&
      typeof place === "object" &&
      place.name &&
      Number.isFinite(Number(place.lat)) &&
      Number.isFinite(Number(place.lng))
    ) {
      const normalizedPlace = {
        id: place.id || `${Number(place.lat)},${Number(place.lng)}`,
        name: String(place.name).trim(),
        address: String(place.address || "").trim(),
        lat: Number(place.lat),
        lng: Number(place.lng),
        category: place.category || "Endereços",
      };
      dynamicPlacesMap.set(normalize(normalizedPlace.name), normalizedPlace);
      dynamicPlacesMap.set(
        normalize(`${normalizedPlace.name} · ${normalizedPlace.address}`),
        normalizedPlace,
      );
      dynamicPlacesMap.set(String(normalizedPlace.id), normalizedPlace);
    }
  }
}

export function getDynamicPlaces() {
  const unique = new Map();
  for (const place of dynamicPlacesMap.values()) {
    unique.set(`${place.lat.toFixed(5)},${place.lng.toFixed(5)}`, place);
  }
  return [...unique.values()];
}

export function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function resolveLocation(value) {
  if (!value) return null;
  const saved = readStorage(userKey("favorites"), []);
  const recents = readStorage(userKey("recents"), []);
  const everyday = [
    readStorage(userKey("homeInfo")),
    readStorage(userKey("workInfo")),
  ].filter(Boolean);
  const all = [
    ...locations,
    ...everyday,
    ...(Array.isArray(saved) ? saved.filter(Boolean) : []),
    ...(Array.isArray(recents) ? recents.filter(Boolean) : []),
    ...getDynamicPlaces(),
  ];
  const known = all.find(
    (place) =>
      place.id === value ||
      normalize(place.name || place.title) === normalize(value) ||
      normalize(`${place.name || place.title} · ${place.address || ""}`) ===
        normalize(value),
  );
  if (
    known &&
    Number.isFinite(Number(known.lat)) &&
    Number.isFinite(Number(known.lng)) &&
    known.lat != null &&
    known.lng != null
  )
    return {
      ...known,
      lat: Number(known.lat),
      lng: Number(known.lng),
    };
  const match = String(value)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]),
    lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const exact = all.find(
    (place) =>
      place.lat != null &&
      place.lng != null &&
      Math.abs(Number(place.lat) - lat) < 0.0001 &&
      Math.abs(Number(place.lng) - lng) < 0.0001,
  );
  if (exact)
    return {
      ...exact,
      name: exact.name || exact.title,
      address: exact.address || exact.subtitle,
      lat,
      lng,
    };
  return {
    id: `${lat},${lng}`,
    name: "Local personalizado",
    address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
    category: "Seus locais",
  };
}

export async function searchAddressSuggestions(query, signal) {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 3 || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) {
    return [];
  }
  try {
    const data = await api(
      `/stations/geocode?${new URLSearchParams({ q: trimmed })}`,
      { signal, timeoutMs: 12000 },
    );
    const places = Array.isArray(data?.places) ? data.places : [];
    rememberGeocodedPlaces(places);
    return places;
  } catch (err) {
    if (signal?.aborted) throw err;
    return [];
  }
}

export async function reverseGeocodeCoordinates(lat, lng, signal) {
  try {
    const data = await api(
      `/stations/reverse?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`,
      { signal, timeoutMs: 10000 },
    );
    if (data?.place) {
      rememberGeocodedPlaces([data.place]);
      return data.place;
    }
  } catch (err) {
    if (signal?.aborted) throw err;
  }
  return {
    id: `${lat},${lng}`,
    name: "Localização selecionada",
    address: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
    lat: Number(lat),
    lng: Number(lng),
    category: "Mapa",
  };
}
