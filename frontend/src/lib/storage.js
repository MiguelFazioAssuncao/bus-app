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
