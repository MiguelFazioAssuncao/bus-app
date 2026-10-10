function savedTheme() {
  try {
    const saved = localStorage.getItem("busapp-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Use the device preference when storage is unavailable. */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
let theme = savedTheme();
document.documentElement.dataset.theme = theme;
export const getTheme = () => theme;
export function subscribeTheme(callback) {
  window.addEventListener("busapp-theme", callback);
  return () => window.removeEventListener("busapp-theme", callback);
}
export function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#161b29" : "#f7f8fa");
  try {
    localStorage.setItem("busapp-theme", theme);
  } catch {
    /* The toggle still works for this session. */
  }
  window.dispatchEvent(new Event("busapp-theme"));
}
