export const languages = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
} as const;
export type Locale = keyof typeof languages;
export const isLocale = (x: unknown): x is Locale =>
  typeof x === "string" && Object.hasOwn(languages, x);
export function routeLocale(url: URL): Locale {
  const l = url.pathname.split("/")[1];
  return isLocale(l) ? l : "es";
}
export function unlocalizedPath(path: string) {
  return path.replace(/^\/(es|en|pt|fr)(?=\/|$)/, "") || "/";
}
export function localizedPath(path: string, lang: Locale) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /^\/(api|fonts|demo)\//.test(path) ||
    /\.(css|js|svg|jpg|png|woff2|ttf|csv|py)$/.test(path.split("?")[0])
  )
    return path;
  const clean = unlocalizedPath(path);
  return lang === "es" ? clean : "/" + lang + (clean === "/" ? "" : clean);
}
