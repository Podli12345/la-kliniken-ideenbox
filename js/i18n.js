/**
 * Oberfläche: eine JSON-Datei pro Sprache unter locales/.
 * Weitere Sprache: Datei ergänzen und die id in UI_LANGS eintragen.
 * Keine externen Übersetzungsdienste.
 */

import { UI_LANGS } from "./config.js";

const LOCALE_KEY = "kvlandshut.ideenbox.ui";
const bundles = {};
let current = "de";

export function getLocale() {
  return current;
}

export function localeDir() {
  return UI_LANGS.find((item) => item.id === current)?.dir || "ltr";
}

export function intlLocale() {
  const map = { de: "de-DE", en: "en-GB", tr: "tr-TR", ro: "ro-RO", hr: "hr-HR", pl: "pl-PL", uk: "uk-UA", ar: "ar" };
  return map[current] || "de-DE";
}

export function t(key, vars) {
  const raw = bundles[current]?.strings?.[key] ?? bundles.de?.strings?.[key] ?? key;
  if (!vars) return raw;
  return String(raw).replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
}

export async function setLocale(code) {
  const next = UI_LANGS.some((item) => item.id === code) ? code : "de";
  await load(next);
  if (next !== "de") await load("de");
  current = next;
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    /* Privatmodus */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.documentElement.dir = localeDir();
  }
  return next;
}

async function load(code) {
  if (bundles[code]) return bundles[code];
  const url = new URL(`../locales/${code}.json`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`locale ${code}`);
  bundles[code] = await response.json();
  return bundles[code];
}

export async function initI18n() {
  let stored = "de";
  try {
    stored = localStorage.getItem(LOCALE_KEY) || "de";
  } catch {
    stored = "de";
  }
  await setLocale(stored);
}
