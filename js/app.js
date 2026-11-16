import { PROTOTYPE_WARNING } from "./config.js";
import { inspectConduct } from "./conduct.js";
import { escapeHtml } from "./format.js";
import { filterIdeas, sortForModeration } from "./filter.js";
import { getLocale, initI18n, setLocale, t } from "./i18n.js";
import { canModerate, createRepository } from "./repository.js";
import * as views from "./views.js";

const repo = createRepository(window.localStorage);
const app = document.querySelector("#app");
const state = {
  user: null,
  ideas: [],
  stats: null,
  savings: null,
  savingsLang: "de",
  filters: { q: "", category: "", location: "", status: "", language: "", sort: "new" },
  draft: emptyDraft(),
  similar: null,
  commentFor: null,
  modDraft: null,
  flash: null,
  busy: false,
};
let keepFlash = false;
let similarTimer = 0;
let similarToken = 0;

function emptyDraft() {
  return {
    title: "",
    description: "",
    category: "",
    location: "",
    savingsMin: "",
    savingsMax: "",
    effort: "",
    profession: "keine",
    ageGroup: "keine",
    tenure: "keine",
    gender: "keine",
    homeArea: "keine",
    language: "de",
    germanSummary: "",
    freshPseudonym: false,
  };
}

function parseRoute(hash) {
  const parts = (hash || "").replace(/^#/, "").replace(/^\//, "").split("/").filter(Boolean);
  const [name, id] = parts;
  if (!name) return { name: "ideen" };
  if (name === "ideen" && id) return { name: "detail", id: decodeURIComponent(id) };
  if (name === "moderation" && id) return { name: "moderation", id: decodeURIComponent(id) };
  if (["ideen", "einreichen", "meine", "moderation", "auswertung", "hinweise", "anmelden", "sparen"].includes(name)) {
    return { name };
  }
  return { name: "unknown" };
}

function activeOf(route) {
  if (route.name === "detail") return "ideen";
  return route.name;
}

function navigate(hash, flash) {
  state.flash = flash || null;
  keepFlash = Boolean(flash);
  if (location.hash === hash) render();
  else location.hash = hash;
}

function paintChrome() {
  const banner = document.getElementById("proto-banner");
  const translated = t("banner.warning");
  const extra = getLocale() !== "de" && translated !== PROTOTYPE_WARNING
    ? `<span class="banner-sub">${escapeHtml(translated)}</span>` : "";
  if (banner) banner.innerHTML = `<strong>${escapeHtml(PROTOTYPE_WARNING)}</strong>${extra}`;
  const skip = document.querySelector(".skip");
  if (skip) skip.textContent = t("common.skip");
  document.title = t("doc.title");
}

function applyBars() {
  document.querySelectorAll("[data-w]").forEach((el) => {
    const value = Number(el.getAttribute("data-w"));
    if (Number.isFinite(value)) el.style.width = `${Math.max(0, Math.min(100, value))}%`;
  });
}

function showError(error) {
  const box = document.getElementById("form-error");
  if (error?.fields) {
    if (box) box.textContent = t("err.fields");
    document.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    document.querySelectorAll(".field-error.inline").forEach((el) => el.remove());
    for (const [name, code] of Object.entries(error.fields)) {
      const input = document.querySelector(`[name="${name}"]`);
      if (!input) continue;
      input.setAttribute("aria-invalid", "true");
      const note = document.createElement("p");
      note.className = "field-error inline";
      note.textContent = t(`err.${code}`);
      input.insertAdjacentElement("afterend", note);
    }
    document.querySelector("[aria-invalid='true']")?.focus();
    return;
  }
  const text = t(`err.${error?.code || "generic"}`);
  if (box) box.textContent = text === `err.${error?.code}` ? t("err.generic") : text;
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.freshPseudonym = Boolean(form.elements.freshPseudonym?.checked);
  data.acceptRules = Boolean(form.elements.acceptRules?.checked);
  return data;
}

function draftFromIdea(idea) {
  let reason = "";
  let feedback = idea.feedback || "";
  if (idea.status === "abgelehnt" && feedback.includes("\n\n")) {
    const parts = feedback.split("\n\n");
    reason = parts.slice(1).join("\n\n");
    feedback = "";
  } else if (idea.status === "abgelehnt") {
    reason = feedback;
    feedback = "";
  }
  return {
    id: idea.id,
    status: idea.status,
    category: idea.category,
    feedback,
    reason,
    realizedSavings: idea.realizedSavings == null ? "" : String(idea.realizedSavings),
    mergedIntoId: idea.mergedIntoId || "",
    translationDe: idea.translationDe || "",
  };
}

async function paintSimilar() {
  const token = ++similarToken;
  const host = document.getElementById("dubletten");
  if (!host) return;
  const title = state.draft.title;
  const description = state.draft.description;
  const language = state.draft.language || "de";
  const text = `${title} ${description}`.trim();
  let hits = null;
  if (text.length >= 12) hits = await repo.similarIdeas(title, description, language);
  if (token !== similarToken) return;
  const current = document.getElementById("dubletten");
  if (!current) return;
  state.similar = hits;
  const byId = new Map(state.ideas.map((idea) => [idea.id, idea]));
  current.innerHTML = views.similarPanel(hits, byId, state.commentFor, state.user?.rulesAccepted);
}

function paintList() {
  const host = document.getElementById("ergebnis");
  if (!host) return;
  const rows = filterIdeas(state.ideas, state.filters);
  host.innerHTML = views.ideaCards(rows);
  const count = document.getElementById("trefferzahl");
  if (count) count.textContent = t("list.count", { n: rows.length });
}

async function render() {
  state.user = await repo.currentUser();
  const route = parseRoute(location.hash);
  const open = new Set(["anmelden", "hinweise", "sparen"]);
  if (!state.user && !open.has(route.name)) {
    location.replace("#/anmelden");
    return;
  }
  if (state.user && route.name === "anmelden") {
    location.replace("#/ideen");
    return;
  }
  if (state.user && ["ideen", "detail", "einreichen", "meine", "moderation", "auswertung"].includes(route.name)) {
    state.ideas = await repo.listIdeas();
    state.user = await repo.currentUser();
  }
  let content = "";
  if (route.name === "anmelden") content = views.loginPage();
  else if (route.name === "hinweise") content = views.helpPage();
  else if (route.name === "sparen") {
    if (!state.savings) {
      const response = await fetch(new URL("../data/spardruck.json", import.meta.url));
      state.savings = await response.json();
    }
    if (!state.savings[state.savingsLang]) state.savingsLang = state.savings[getLocale()] ? getLocale() : "de";
    content = views.savingsPage(state.savings, state.savingsLang);
  } else if (route.name === "ideen") {
    content = views.listPage({ filters: state.filters, user: state.user });
  } else if (route.name === "meine") {
    content = views.myPage(state.ideas.filter((idea) => idea.mine));
  } else if (route.name === "einreichen") {
    if (!state.draft.language) state.draft.language = getLocale();
    content = views.submitPage(state.draft);
  } else if (route.name === "detail") {
    const idea = state.ideas.find((item) => item.id === route.id);
    if (!idea) content = views.messagePage(t("err.notFoundTitle"), t("err.not-found"), "#/ideen", t("detail.back"));
    else {
      if (idea.mine) state.user = await repo.markSeen(idea.id);
      content = views.detailPage(idea, state.user);
    }
  } else if (route.name === "moderation") {
    if (!state.user || state.user.role === "mitarbeit") {
      content = views.messagePage(t("err.forbiddenTitle"), t("err.wrong-area"), "#/ideen", t("detail.back"));
    } else {
      const queue = sortForModeration(state.ideas.filter((idea) => canModerate(state.user, idea)));
      let id = route.id;
      if (!id && queue[0]) {
        location.replace(`#/moderation/${queue[0].id}`);
        return;
      }
      const selected = state.ideas.find((idea) => idea.id === id) || null;
      if (selected && !canModerate(state.user, selected)) {
        content = views.messagePage(t("err.forbiddenTitle"), t("err.wrong-area"), "#/moderation", t("mod.title"));
      } else {
        if (selected && (!state.modDraft || state.modDraft.id !== selected.id)) state.modDraft = draftFromIdea(selected);
        const candidates = state.ideas.filter((idea) => idea.id !== selected?.id && idea.status !== "zusammengefuehrt");
        content = views.moderationPage({ user: state.user, queue, selected, draft: state.modDraft, candidates });
      }
    }
  } else if (route.name === "auswertung") {
    if (state.user?.role !== "admin") {
      content = views.messagePage(t("err.forbiddenTitle"), t("err.admin-only"), "#/ideen", t("detail.back"));
    } else {
      state.stats = await repo.adminStats();
      content = views.statsPage({ ...state.stats, viewerRole: "admin", premoderation: state.user.premoderation });
    }
  } else content = views.messagePage(t("err.notFoundTitle"), t("err.not-found"), "#/ideen", t("detail.back"));

  app.innerHTML = views.layout({ user: state.user, active: activeOf(route), flash: state.flash, content });
  paintChrome();
  if (route.name === "ideen") paintList();
  if (route.name === "einreichen") paintSimilar();
  applyBars();
}

function onHash() {
  if (!keepFlash) state.flash = null;
  keepFlash = false;
  state.modDraft = null;
  render();
}

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (state.busy) return;
  state.busy = true;
  try {
    if (form.id === "login-form") {
      const data = formData(form);
      const user = await repo.login(data);
      navigate("#/ideen", { type: "ok", code: user.firstLogin ? "flash.loginFirst" : "flash.login", vars: { name: user.pseudonym } });
    } else if (form.id === "filter") {
      paintList();
    } else if (form.id === "idea-form") {
      Object.assign(state.draft, formData(form));
      const idea = await repo.createIdea(state.draft);
      state.draft = emptyDraft();
      state.draft.language = getLocale();
      state.similar = null;
      navigate(`#/ideen/${idea.id}`, { type: "ok", code: "flash.created", vars: { name: idea.authorPseudonym } });
    } else if (form.id === "comment-form" || form.id === "similar-comment") {
      const route = parseRoute(location.hash);
      const id = form.id === "similar-comment" ? state.commentFor : route.id;
      const data = formData(form);
      const text = data.comment || data.similarComment;
      const comment = await repo.addComment(id, text, data.acceptRules);
      state.commentFor = null;
      navigate(`#/ideen/${id}`, { type: "ok", code: comment.pending ? "flash.commentPending" : "flash.comment" });
    } else if (form.id === "mod-form") {
      const route = parseRoute(location.hash);
      const data = formData(form);
      data.thanks = t("mod.thanks");
      await repo.moderateIdea(route.id, data);
      state.modDraft = null;
      navigate(`#/moderation/${route.id}`, { type: "ok", code: "flash.saved" });
    }
  } catch (error) {
    showError(error);
  } finally {
    state.busy = false;
  }
});

app.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.id === "logout") {
    await repo.logout();
    navigate("#/anmelden", { type: "ok", code: "flash.logout" });
    return;
  }
  if (button.id === "reset") {
    if (!window.confirm(t("footer.resetConfirm"))) return;
    await repo.resetDemoData();
    state.draft = emptyDraft();
    state.filters = { q: "", category: "", location: "", status: "", language: "", sort: "new" };
    navigate("#/anmelden", { type: "ok", code: "flash.reset" });
    return;
  }
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === "support" && id) {
    try {
      const result = await repo.supportIdea(id);
      navigate(location.hash || "#/ideen", { type: "ok", code: result.already ? "flash.supportedAlready" : "flash.support" });
    } catch (error) {
      state.flash = { type: "error", code: `err.${error.code || "generic"}` };
      render();
    }
    return;
  }
  if (action === "comment-similar") {
    state.commentFor = button.dataset.id;
    paintSimilar();
    return;
  }
  if (action === "report") {
    await repo.reportComment(button.dataset.idea, button.dataset.comment);
    navigate(`#/ideen/${button.dataset.idea}`, { type: "ok", code: "flash.report" });
    return;
  }
  if (action === "hide-comment" || action === "show-comment") {
    const status = action === "hide-comment" ? "hidden" : "visible";
    await repo.setCommentStatus(button.dataset.idea, button.dataset.comment, status);
    navigate(`#/ideen/${button.dataset.idea}`, { type: "ok", code: status === "hidden" ? "flash.hidden" : "flash.saved" });
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (target.id === "suche") {
    state.filters.q = target.value;
    paintList();
    return;
  }
  if (target.form?.id === "idea-form") {
    state.draft[target.name] = target.type === "checkbox" ? target.checked : target.value;
    if (target.name === "title" || target.name === "description" || target.name === "germanSummary") {
      const live = target.form.querySelector(".conduct-live");
      const result = inspectConduct(`${state.draft.title}\n${state.draft.description}\n${state.draft.germanSummary || ""}`);
      if (live) live.textContent = result.person ? t("conduct.person") : result.insult ? t("conduct.insult") : "";
    }
    if (target.name === "title" || target.name === "description" || target.name === "language") {
      clearTimeout(similarTimer);
      similarTimer = setTimeout(paintSimilar, 200);
    }
  }
  if (target.form?.id === "mod-form" && state.modDraft) {
    state.modDraft[target.name] = target.value;
    const live = target.form.querySelector(".conduct-live");
    const result = inspectConduct(`${state.modDraft.feedback || ""}\n${state.modDraft.reason || ""}`);
    if (live) live.textContent = result.person ? t("conduct.person") : result.insult ? t("conduct.insult") : "";
  }
  if (target.name === "comment" || target.name === "similarComment") {
    const live = target.form?.querySelector(".conduct-live");
    const result = inspectConduct(target.value);
    if (live) live.textContent = result.person ? t("conduct.person") : result.insult ? t("conduct.insult") : "";
  }
});

app.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.id === "lang") {
    await setLocale(target.value);
    if (!state.draft.title && !state.draft.description) state.draft.language = getLocale();
    state.savingsLang = state.savings?.[getLocale()] ? getLocale() : state.savingsLang;
    render();
    return;
  }
  if (target.id === "savings-lang") {
    state.savingsLang = target.value;
    render();
    return;
  }
  if (target.id === "premod") {
    await repo.setPremoderation(target.checked);
    state.user = await repo.currentUser();
    render();
    return;
  }
  if (target.form?.id === "filter") {
    state.filters[target.name] = target.value;
    paintList();
  }
  if (target.form?.id === "idea-form") {
    state.draft[target.name] = target.type === "checkbox" ? target.checked : target.value;
    if (target.name === "language") paintSimilar();
  }
  if (target.form?.id === "mod-form" && state.modDraft) {
    state.modDraft[target.name] = target.value;
    if (target.name === "status") {
      const reject = document.getElementById("reject-block");
      const feedback = document.getElementById("feedback-block");
      if (reject) reject.hidden = target.value !== "abgelehnt";
      if (feedback) feedback.hidden = target.value === "abgelehnt";
    }
    if (target.name === "mergedIntoId" && target.value) {
      state.modDraft.status = "zusammengefuehrt";
      const status = target.form.elements.status;
      if (status) status.value = "zusammengefuehrt";
    }
  }
});

window.addEventListener("hashchange", onHash);

initI18n().then(() => {
  state.draft.language = getLocale();
  if (!location.hash) location.replace("#/anmelden");
  else render();
}).catch((error) => {
  app.textContent = `Die Oberfläche konnte nicht geladen werden (${error.message}).`;
});
