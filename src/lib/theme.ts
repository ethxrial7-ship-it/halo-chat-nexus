export type AppTheme = "normal" | "neon";
const KEY = "halo-theme";
export function getTheme(): AppTheme {
  if (typeof window === "undefined") return "normal";
  return localStorage.getItem(KEY) === "neon" ? "neon" : "normal";
}
export function setTheme(theme: AppTheme, reload = false) {
  localStorage.setItem(KEY, theme);
  if (reload) window.location.reload();
  else document.documentElement.dataset["theme"] = theme;
}
export const themeBootScript = `try{if(localStorage.getItem("${KEY}")==="neon")document.documentElement.dataset.theme="neon"}catch(e){}`;
