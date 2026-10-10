import { readStorage, userKey } from "./storage.js";

// A small, explicit local catalog. Coordinates are approximate destination points,
// not bus stops or a substitute for an address geocoding service.
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
];

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
  const everyday = [
    readStorage(userKey("homeInfo")),
    readStorage(userKey("workInfo")),
  ].filter(Boolean);
  const all = [
    ...locations,
    ...everyday,
    ...(Array.isArray(saved) ? saved.filter(Boolean) : []),
  ];
  const known = all.find(
    (place) =>
      place.id === value ||
      normalize(place.name || place.title) === normalize(value),
  );
  if (
    known &&
    Number.isFinite(Number(known.lat)) &&
    Number.isFinite(Number(known.lng)) &&
    known.lat != null &&
    known.lng != null
  )
    return known;
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
      Number(place.lat) === lat &&
      Number(place.lng) === lng,
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
