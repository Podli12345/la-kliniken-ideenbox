import { SLA_DAYS } from "./config.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function formatEuro(value, locale = "de-DE") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSavings(min, max, locale = "de-DE") {
  if (min == null && max == null) return "";
  if (min != null && max != null && min !== max) return `${formatEuro(min, locale)} – ${formatEuro(max, locale)}`;
  if (min != null && max == null) return formatEuro(min, locale);
  if (min == null && max != null) return formatEuro(max, locale);
  return formatEuro(min, locale);
}

/** Leere Eingabe wird null, Ungültiges NaN, Beträge in ganzen Euro. */
export function parseEuro(input) {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  let text = raw.replace(/\s/g, "").replace(/€/g, "");
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(text)) return Number.NaN;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > 100000000) return Number.NaN;
  return Math.round(value);
}

export function formatDate(iso, locale = "de-DE") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function berlinDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(ymd, days) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function daysBetween(fromYmd, toYmd) {
  const start = Date.parse(`${fromYmd}T00:00:00Z`);
  const end = Date.parse(`${toYmd}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

export function feedbackDue(idea, nowValue) {
  const open = idea.status === "eingereicht" || idea.status === "in_pruefung";
  if (!open) return { state: "closed" };
  if (String(idea.feedback || "").trim()) return { state: "answered" };
  const created = berlinDay(idea.createdAt);
  const today = berlinDay(nowValue);
  const dueDate = addDays(created, SLA_DAYS);
  return { state: "open", days: daysBetween(today, dueDate), dueDate };
}

export function dueLabel(due) {
  if (!due || due.state !== "open") return "";
  const { days } = due;
  if (days > 1) return `Rückmeldung fällig in ${days} Tagen`;
  if (days === 1) return "Rückmeldung fällig in 1 Tag";
  if (days === 0) return "Rückmeldung fällig heute";
  const overdue = Math.abs(days);
  if (overdue === 1) return "Rückmeldung überfällig seit 1 Tag";
  return `Rückmeldung überfällig seit ${overdue} Tagen`;
}

export function dueNote(due) {
  if (due?.state === "answered") return "Rückmeldung liegt vor";
  return dueLabel(due);
}

export function dueInfo(due) {
  if (!due || due.state === "closed") return null;
  if (due.state === "answered") return { key: "due.answered" };
  if (due.days > 1) return { key: "due.in", n: due.days };
  if (due.days === 1) return { key: "due.in1" };
  if (due.days === 0) return { key: "due.today" };
  if (due.days === -1) return { key: "due.over1" };
  return { key: "due.over", n: Math.abs(due.days) };
}

export function dueClass(due) {
  if (!due || due.state === "closed") return "";
  if (due.state === "answered") return "due-answered";
  if (due.days < 0) return "due-overdue";
  if (due.days <= 7) return "due-soon";
  return "due-open";
}

export function excerpt(text, length = 180) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length - 1).trimEnd()}…`;
}

export function countNoun(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}
