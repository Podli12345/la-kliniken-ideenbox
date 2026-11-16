/** Konstanten der Ideenbox. Keine personenbezogenen Daten, keine externen Dienste. */

export const PROTOTYPE_WARNING =
  "Prototyp – nur Demodaten, keine echten Ideen oder personenbezogenen Daten eingeben";

export const DEMO_PASSWORD = "demo";
export const SLA_DAYS = 30;
export const K_ANONYMITY = 5;
export const STORAGE_PREFIX = "kvlandshut.ideenbox.v1";

export const CATEGORIES = [
  { id: "material", label: "Material" },
  { id: "energie", label: "Energie" },
  { id: "prozesse", label: "Prozesse" },
  { id: "dokumentation", label: "Dokumentation" },
  { id: "einkauf", label: "Einkauf" },
  { id: "personal", label: "Personal" },
  { id: "patientenfluss", label: "Patientenfluss" },
  { id: "medizintechnik", label: "Medizintechnik" },
  { id: "verpflegung", label: "Verpflegung" },
  { id: "it", label: "IT & Digitalisierung" },
];

export const LOCATIONS = [
  { id: "mitte", label: "Landshut-Mitte" },
  { id: "achdorf", label: "Achdorf" },
  { id: "rottenburg", label: "Rottenburg" },
  { id: "kinder", label: "Kinderklinik" },
  { id: "verbund", label: "Verbundweit" },
];

export const EFFORTS = [
  { id: "gering", label: "Gering – im Alltag umsetzbar" },
  { id: "mittel", label: "Mittel – Abstimmung mehrerer Bereiche" },
  { id: "hoch", label: "Hoch – Projekt, Investition oder Bau" },
];

export const STATUSES = [
  { id: "eingereicht", label: "Eingereicht", color: "#5e6b7a" },
  { id: "in_pruefung", label: "In Prüfung", color: "#1e4d78" },
  { id: "angenommen", label: "Angenommen", color: "#3e6d58" },
  { id: "umgesetzt", label: "Umgesetzt", color: "#1f5c3a" },
  { id: "abgelehnt", label: "Abgelehnt", color: "#8a4545" },
  { id: "zusammengefuehrt", label: "Zusammengeführt", color: "#8d97a3" },
];

export const PROFESSIONS = [
  { id: "arzt", label: "Ärztlicher Dienst" },
  { id: "pflege", label: "Pflege" },
  { id: "funktion", label: "Funktionsdienst" },
  { id: "verwaltung", label: "Verwaltung" },
  { id: "technik", label: "Technik/Service" },
  { id: "ausbildung", label: "Auszubildende/Studierende" },
  { id: "sonstige", label: "Sonstige" },
  { id: "keine", label: "keine Angabe" },
];

export const AGE_GROUPS = [
  { id: "u30", label: "unter 30" },
  { id: "a30", label: "30–44" },
  { id: "a45", label: "45–59" },
  { id: "a60", label: "ab 60" },
  { id: "keine", label: "keine Angabe" },
];

export const TENURES = [
  { id: "u2", label: "unter 2 Jahren" },
  { id: "y2", label: "2–10 Jahre" },
  { id: "y10", label: "über 10 Jahre" },
  { id: "keine", label: "keine Angabe" },
];

export const HOME_AREAS = [
  { id: "operativ", label: "Operative Fächer" },
  { id: "konservativ", label: "Konservative Fächer/Innere" },
  { id: "pflege", label: "Pflege" },
  { id: "funktion", label: "Funktionsdienste" },
  { id: "verwaltung", label: "Verwaltung" },
  { id: "technik", label: "Technik/Service" },
  { id: "keine", label: "keine Angabe" },
];

export const GENDERS = [
  { id: "w", label: "Weiblich" },
  { id: "m", label: "Männlich" },
  { id: "d", label: "Divers" },
  { id: "keine", label: "keine Angabe" },
];

export const ROLE_LABELS = {
  mitarbeit: "Mitarbeitende/r",
  moderation: "Bereichsmoderator/in",
  admin: "Ideenmanagement-Admin",
};

export const UI_LANGS = [
  { id: "de", label: "Deutsch", dir: "ltr" },
  { id: "en", label: "English", dir: "ltr" },
  { id: "tr", label: "Türkçe", dir: "ltr" },
  { id: "ro", label: "Română", dir: "ltr" },
  { id: "hr", label: "Hrvatski", dir: "ltr" },
  { id: "pl", label: "Polski", dir: "ltr" },
  { id: "uk", label: "Українська", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
];

export const SAVINGS_NOTICE =
  "Maschinell übersetzter Entwurf – vor Veröffentlichung durch Muttersprachler prüfen.";

export const DEMO_USERS = [
  {
    username: "mitarbeiter",
    password: "demo",
    role: "mitarbeit",
    areas: [],
    pseudonym: "Idee-Fuchs-4821",
  },
  {
    username: "moderation",
    password: "demo",
    role: "moderation",
    areas: ["material", "einkauf", "energie", "prozesse", "patientenfluss", "dokumentation"],
    pseudonym: "Idee-Kiebitz-5050",
  },
  {
    username: "admin",
    password: "demo",
    role: "admin",
    areas: CATEGORIES.map((item) => item.id),
    pseudonym: "Idee-Alk-3033",
  },
];

export const ANIMALS = [
  "Fuchs",
  "Dachs",
  "Reiher",
  "Luchs",
  "Otter",
  "Marder",
  "Kranich",
  "Biber",
  "Uhu",
  "Iltis",
  "Falke",
  "Igel",
  "Pirol",
  "Sperber",
  "Wiesel",
  "Alk",
  "Habicht",
  "Kiebitz",
];

export const SORTS = [
  { id: "new", label: "Neueste" },
  { id: "support", label: "Meiste Unterstützung" },
  { id: "savings", label: "Höchstes Einsparpotenzial" },
];

export function labelOf(list, id) {
  const row = list.find((item) => item.id === id);
  return row ? row.label : "";
}
