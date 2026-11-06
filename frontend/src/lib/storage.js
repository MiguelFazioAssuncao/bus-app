import { api } from "./api.js";

// Storage can be unavailable in private browsing or on restricted devices.
export function readStorage(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function userKey(key) {
  return `${key}_${readStorage("user", {})?.id || "anon"}`;
}

export function getAuthSession() {
  try {
    const token = localStorage.getItem("token") || "";
    const user = readStorage("user", null);
    return { token, user, authenticated: Boolean(token && user?.id) };
  } catch {
    return { token: "", user: null, authenticated: false };
  }
}

export async function pullPreferencesFromCloud(signal) {
  const { token, user, authenticated } = getAuthSession();
  if (!authenticated) return null;
  try {
    const data = await api(
      `/directions/preferences?${new URLSearchParams({ userId: String(user.id) })}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    );
    if (data?.home && data.home.lat != null && data.home.lng != null) {
      writeStorage(`homeInfo_${user.id}`, data.home);
    }
    if (data?.work && data.work.lat != null && data.work.lng != null) {
      writeStorage(`workInfo_${user.id}`, data.work);
    }
    if (Array.isArray(data?.favorites) && data.favorites.length > 0) {
      const localFavs = readStorage(`favorites_${user.id}`, []);
      const merged = [...data.favorites, ...(Array.isArray(localFavs) ? localFavs : [])];
      const unique = [
        ...new Map(
          merged
            .filter((item) => item && item.name)
            .map((item) => [`${item.lat},${item.lng}-${item.name}`, item]),
        ).values(),
      ];
      writeStorage(`favorites_${user.id}`, unique);
    }
    if (Array.isArray(data?.recents) && data.recents.length > 0) {
      const localRecents = readStorage(`recents_${user.id}`, []);
      const merged = [...data.recents, ...(Array.isArray(localRecents) ? localRecents : [])];
      const unique = [
        ...new Map(
          merged
            .filter((item) => item && item.name)
            .map((item) => [`${item.lat},${item.lng}-${item.name}`, item]),
        ).values(),
      ].slice(0, 12);
      writeStorage(`recents_${user.id}`, unique);
    }
    return data;
  } catch {
    return null;
  }
}

export async function pushPreferencesToCloud(overrides = {}) {
  const { token, user, authenticated } = getAuthSession();
  if (!authenticated) return false;
  try {
    const payload = {
      userId: user.id,
      home:
        overrides.home !== undefined
          ? overrides.home
          : readStorage(`homeInfo_${user.id}`, null),
      work:
        overrides.work !== undefined
          ? overrides.work
          : readStorage(`workInfo_${user.id}`, null),
      favorites:
        overrides.favorites !== undefined
          ? overrides.favorites
          : readStorage(`favorites_${user.id}`, []),
      recents:
        overrides.recents !== undefined
          ? overrides.recents
          : readStorage(`recents_${user.id}`, []),
    };
    await api("/directions/preferences", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}
