import {
  AGE_GROUPS,
  CATEGORIES,
  EFFORTS,
  GENDERS,
  HOME_AREAS,
  LOCATIONS,
  PROFESSIONS,
  SORTS,
  STATUSES,
  TENURES,
  UI_LANGS,
  SAVINGS_NOTICE,
} from "./config.js";
import { dueClass, dueInfo, escapeHtml, excerpt, formatDate, formatEuro, formatSavings } from "./format.js";
import { getLocale, intlLocale, t } from "./i18n.js";

function options(list, selected, placeholder, prefix) {
  const head = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "";
  return head + list.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === selected ? " selected" : ""}>${escapeHtml(t(`${prefix}${item.id}`))}</option>`).join("");
}

function moneyRange(min, max) {
  const amount = formatSavings(min, max, intlLocale());
  if (!amount) return t("common.notEstimated");
  return `${amount} / ${t("common.year")}`;
}

function badgeStatus(idea) {
  return `<span class="badge status-${escapeHtml(idea.status)}">${escapeHtml(t(`status.${idea.status}`))}</span>`;
}

function badgeOrigin(idea) {
  const label = idea.origin === "local" ? t("common.localBadge") : t("common.demoBadge");
  const kind = idea.origin === "local" ? "origin-local" : "origin-demo";
  return `<span class="badge ${kind}">${escapeHtml(label)}</span>`;
}

function dueLine(idea) {
  const info = dueInfo(idea.due);
  if (!info) return "";
  return `<p class="due ${dueClass(idea.due)}">${escapeHtml(t(info.key, { n: info.n }))}</p>`;
}

export function ideaCards(ideas) {
  if (!ideas.length) return `<p class="empty">${escapeHtml(t("filter.empty"))}</p>`;
  return `<div class="cards">${ideas.map((idea) => `
    <article class="card">
      <div class="card-top">
        <h2><a href="#/ideen/${escapeHtml(idea.id)}">${escapeHtml(idea.title)}</a></h2>
        <div class="badges">${badgeOrigin(idea)}<span class="lang-code">${escapeHtml((idea.language || "de").toUpperCase())}</span>${badgeStatus(idea)}${idea.unread ? `<span class="badge badge-new">${escapeHtml(t("mine.new"))}</span>` : ""}</div>
      </div>
      <p class="meta">${escapeHtml(t(`cat.${idea.category}`))} · ${escapeHtml(t(`loc.${idea.location}`))} · ${escapeHtml(t(`effort.${idea.effort}`))} · ${escapeHtml(idea.authorPseudonym)} · ${escapeHtml(formatDate(idea.createdAt, intlLocale()))}</p>
      <p>${escapeHtml(excerpt(idea.description))}</p>
      <p class="savings">${escapeHtml(t("list.estimated"))}: ${escapeHtml(moneyRange(idea.savingsMin, idea.savingsMax))}${idea.status === "umgesetzt" && idea.realizedSavings != null ? ` · ${escapeHtml(t("list.realized"))}: ${escapeHtml(formatEuro(idea.realizedSavings, intlLocale()))}` : ""}</p>
      ${dueLine(idea)}
      ${idea.mergedInto ? `<p class="merge-note">${escapeHtml(t("list.merged"))} <a href="#/ideen/${escapeHtml(idea.mergedInto.id)}">${escapeHtml(idea.mergedInto.title)}</a></p>` : ""}
      <div class="card-actions">
        <button type="button" class="button secondary" data-action="support" data-id="${escapeHtml(idea.id)}" ${idea.supportedByMe || idea.status === "zusammengefuehrt" ? "disabled" : ""}>${escapeHtml(idea.supportedByMe ? t("list.supported") : t("list.support"))} · ${idea.supportCount}</button>
        <a href="#/ideen/${escapeHtml(idea.id)}">${escapeHtml(t("list.comments", { n: idea.comments.length }))}</a>
      </div>
    </article>`).join("")}</div>`;
}

export function listPage(filters) {
  return `
    <h1>${escapeHtml(t("list.title"))}</h1>
    <p class="lede">${escapeHtml(t("list.lede"))} <strong>${escapeHtml(filters.user.pseudonym)}</strong>. <a href="#/hinweise">${escapeHtml(t("nav.help"))}</a></p>
    <form id="filter" class="filters" role="search">
      <label>${escapeHtml(t("list.search"))}
        <input id="suche" name="q" type="search" value="${escapeHtml(filters.filters.q)}" placeholder="${escapeHtml(t("list.searchPh"))}">
      </label>
      <label>${escapeHtml(t("list.category"))}
        <select name="category">${options(CATEGORIES, filters.filters.category, t("common.allAreas"), "cat.")}</select>
      </label>
      <label>${escapeHtml(t("list.location"))}
        <select name="location">${options(LOCATIONS, filters.filters.location, t("common.allSites"), "loc.")}</select>
      </label>
      <label>${escapeHtml(t("list.status"))}
        <select name="status">${options(STATUSES, filters.filters.status, t("common.allStatus"), "status.")}</select>
      </label>
      <label>${escapeHtml(t("list.language"))}
        <select name="language">${options(UI_LANGS, filters.filters.language, t("common.allLanguages"), "lang.")}</select>
      </label>
      <label>${escapeHtml(t("list.sort"))}
        <select name="sort">${options(SORTS, filters.filters.sort || "new", "", "sort.")}</select>
      </label>
    </form>
    <p id="trefferzahl" class="result-count"></p>
    <div id="ergebnis"></div>`;
}

function commentItems(idea, user) {
  if (!idea.comments.length) return `<p class="hint">${escapeHtml(t("detail.noComments"))}</p>`;
  const staff = user.role === "admin" || user.role === "moderation";
  return idea.comments.map((comment) => `
    <li class="comment ${escapeHtml(comment.status)}">
      <p class="meta">${escapeHtml(comment.pseudonym)} · ${escapeHtml(formatDate(comment.createdAt, intlLocale()))}${comment.status === "pending" ? ` · ${escapeHtml(t("detail.pending"))}` : ""}${comment.status === "hidden" ? ` · ${escapeHtml(t("detail.hidden"))}` : ""}</p>
      <p>${escapeHtml(comment.text)}</p>
      <div class="card-actions">
        ${comment.mine ? "" : `<button type="button" class="button secondary small" data-action="report" data-idea="${escapeHtml(idea.id)}" data-comment="${escapeHtml(comment.id)}" ${comment.reportedByMe ? "disabled" : ""}>${escapeHtml(comment.reportedByMe ? t("detail.reported") : t("detail.report"))}</button>`}
        ${staff && comment.reportCount ? `<span class="hint">${escapeHtml(t("detail.reportCount", { n: comment.reportCount }))}</span>` : ""}
        ${staff && comment.status !== "hidden" ? `<button type="button" class="button secondary small" data-action="hide-comment" data-idea="${escapeHtml(idea.id)}" data-comment="${escapeHtml(comment.id)}">${escapeHtml(t("detail.hide"))}</button>` : ""}
        ${staff && comment.status === "hidden" ? `<button type="button" class="button secondary small" data-action="show-comment" data-idea="${escapeHtml(idea.id)}" data-comment="${escapeHtml(comment.id)}">${escapeHtml(t("detail.unhide"))}</button>` : ""}
        ${staff && comment.status === "pending" ? `<button type="button" class="button small" data-action="show-comment" data-idea="${escapeHtml(idea.id)}" data-comment="${escapeHtml(comment.id)}">${escapeHtml(t("detail.approve"))}</button>` : ""}
      </div>
    </li>`).join("");
}

function rulesBlock(user) {
  if (user.rulesAccepted) return "";
  return `
    <fieldset class="quiet rules">
      <legend>${escapeHtml(t("detail.rulesTitle"))}</legend>
      <p>${escapeHtml(t("detail.rulesBody"))}</p>
      <label class="check"><input type="checkbox" name="acceptRules" required> ${escapeHtml(t("detail.rulesCheck"))}</label>
    </fieldset>`;
}

export function detailPage(idea, user) {
  const canEdit = user.role === "admin" || (user.role === "moderation" && user.areas.includes(idea.category));
  return `
    <p class="back"><a href="#/ideen">${escapeHtml(t("detail.back"))}</a></p>
    <div class="card-top">
      <h1>${escapeHtml(idea.title)}</h1>
      <div class="badges">${badgeOrigin(idea)}<span class="lang-code">${escapeHtml((idea.language || "de").toUpperCase())}</span>${badgeStatus(idea)}</div>
    </div>
    <p class="meta">${escapeHtml(t(`cat.${idea.category}`))} · ${escapeHtml(t(`loc.${idea.location}`))} · ${escapeHtml(t("detail.effort"))}: ${escapeHtml(t(`effort.${idea.effort}`))}</p>
    <p class="meta">${escapeHtml(t("detail.submitted", { date: formatDate(idea.createdAt, intlLocale()), name: idea.authorPseudonym }))}</p>
    ${dueLine(idea)}
    <p class="savings">${escapeHtml(t("detail.potential"))}: ${escapeHtml(moneyRange(idea.savingsMin, idea.savingsMax))}</p>
    ${idea.status === "umgesetzt" && idea.realizedSavings != null ? `<p class="savings">${escapeHtml(t("detail.realized"))}: ${escapeHtml(formatEuro(idea.realizedSavings, intlLocale()))}</p>` : ""}
    ${idea.mergedInto ? `<p class="callout">${escapeHtml(t("detail.merged"))} <a href="#/ideen/${escapeHtml(idea.mergedInto.id)}">${escapeHtml(idea.mergedInto.title)}</a></p>` : ""}
    ${idea.mergedFrom?.length ? `<div class="callout"><p>${escapeHtml(t("detail.mergedHere"))}</p><ul>${idea.mergedFrom.map((item) => `<li><a href="#/ideen/${escapeHtml(item.id)}">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>` : ""}
    <div class="prose"><p>${escapeHtml(idea.description)}</p></div>
    ${idea.germanSummary ? `<section class="callout"><h2>${escapeHtml(t("detail.summary"))}</h2><p>${escapeHtml(idea.germanSummary)}</p></section>` : ""}
    ${idea.translationDe ? `<section class="callout"><h2>${escapeHtml(t("detail.translation"))}</h2><p>${escapeHtml(idea.translationDe)}</p></section>` : ""}
    <p class="hint">${escapeHtml(t("detail.noPersonal"))}</p>
    <div class="card-actions">
      <button type="button" class="button" data-action="support" data-id="${escapeHtml(idea.id)}" ${idea.supportedByMe || idea.status === "zusammengefuehrt" ? "disabled" : ""}>${escapeHtml(idea.supportedByMe ? t("list.supported") : t("list.support"))} · ${idea.supportCount}</button>
      ${canEdit ? `<a class="button secondary" href="#/moderation/${escapeHtml(idea.id)}">${escapeHtml(t("detail.moderate"))}</a>` : ""}
    </div>
    ${idea.supporters.length ? `<p class="meta">${escapeHtml(t("detail.supporters"))}: ${idea.supporters.map((name) => escapeHtml(name)).join(", ")}</p>` : ""}
    <section class="thread">
      <h2>${escapeHtml(t("detail.thread"))}</h2>
      ${idea.feedback ? `
        <article class="official">
          <h3>${escapeHtml(t("detail.official"))}</h3>
          <p class="meta">${escapeHtml(t("detail.officialBy", { area: t(`cat.${idea.category}`) }))}${idea.feedbackAt ? ` · ${escapeHtml(formatDate(idea.feedbackAt, intlLocale()))}` : ""}</p>
          <p class="pre">${escapeHtml(idea.feedback)}</p>
        </article>` : `<p class="hint">${escapeHtml(t("detail.noAnswer"))}</p>`}
      <ul class="comments">${commentItems(idea, user)}</ul>
      <form id="comment-form" class="stack">
        <p id="form-error" class="field-error" role="alert"></p>
        ${rulesBlock(user)}
        <label>${escapeHtml(t("detail.commentLabel"))}
          <textarea name="comment" maxlength="1000" required placeholder="${escapeHtml(t("detail.commentPh"))}"></textarea>
        </label>
        <p class="conduct-live field-error" role="status"></p>
        <button class="button" type="submit">${escapeHtml(t("detail.commentSave"))}</button>
      </form>
    </section>`;
}

export function similarPanel(hits, ideasById, commentFor, rulesAccepted) {
  if (!hits) {
    return `<h2>${escapeHtml(t("submit.similar"))}</h2><p id="dubletten-status" aria-live="polite">${escapeHtml(t("submit.similarWait"))}</p>`;
  }
  const status = hits.length === 0 ? t("submit.similarNone") : hits.length === 1 ? t("submit.similarOne") : t("submit.similarMany", { n: hits.length });
  const items = hits.map((hit) => {
    const idea = ideasById.get(hit.id);
    if (!idea) return "";
    return `
      <article class="similar-item">
        <h3><a href="#/ideen/${escapeHtml(idea.id)}">${escapeHtml(idea.title)}</a></h3>
        <p class="meta"><span class="lang-code">${escapeHtml((idea.language || "de").toUpperCase())}</span> ${escapeHtml(t(`cat.${idea.category}`))} · ${escapeHtml(t(`loc.${idea.location}`))} · ${escapeHtml(t(`status.${idea.status}`))}</p>
        <p>${escapeHtml(excerpt(idea.description, 140))}</p>
        ${hit.sharedLabels?.length ? `<p class="terms">${escapeHtml(t("submit.terms"))}: ${escapeHtml(hit.sharedLabels.join(", "))}</p>` : ""}
        <div class="card-actions">
          <button type="button" class="button secondary" data-action="support" data-id="${escapeHtml(idea.id)}" ${idea.supportedByMe ? "disabled" : ""}>${escapeHtml(idea.supportedByMe ? t("list.supported") : t("submit.support"))}</button>
          <button type="button" class="button secondary" data-action="comment-similar" data-id="${escapeHtml(idea.id)}">${escapeHtml(t("submit.comment"))}</button>
        </div>
        ${commentFor === idea.id ? `<form id="similar-comment" class="stack">${rulesAccepted ? "" : `<label class="check"><input type="checkbox" name="acceptRules" required> ${escapeHtml(t("detail.rulesCheck"))}</label>`}<label>${escapeHtml(t("detail.commentLabel"))}<textarea name="similarComment" maxlength="1000" required></textarea></label><p class="conduct-live field-error" role="status"></p><button class="button" type="submit">${escapeHtml(t("detail.commentSave"))}</button></form>` : ""}
      </article>`;
  }).join("");
  return `<h2>${escapeHtml(t("submit.similar"))}</h2><p id="dubletten-status" aria-live="polite">${escapeHtml(status)}</p>${items}`;
}

export function submitPage(draft) {
  return `
    <h1>${escapeHtml(t("submit.title"))}</h1>
    <p class="lede">${escapeHtml(t("submit.lede"))}</p>
    <form id="idea-form" class="stack" autocomplete="off">
      <p id="form-error" class="field-error" role="alert"></p>
      <div class="split">
        <label>${escapeHtml(t("submit.lang"))}
          <select name="language">${options(UI_LANGS, draft.language || getLocale(), "", "lang.")}</select>
        </label>
      </div>
      <label>${escapeHtml(t("submit.titleLabel"))}
        <input name="title" maxlength="140" required value="${escapeHtml(draft.title)}" placeholder="${escapeHtml(t("submit.titlePh"))}">
      </label>
      <label>${escapeHtml(t("submit.desc"))}
        <textarea name="description" maxlength="4000" required placeholder="${escapeHtml(t("submit.descPh"))}">${escapeHtml(draft.description)}</textarea>
      </label>
      <p class="conduct-live field-error" role="status"></p>
      <div id="dubletten" class="similar"></div>
      <label>${escapeHtml(t("submit.summary"))}
        <textarea name="germanSummary" maxlength="500" placeholder="${escapeHtml(t("submit.summaryPh"))}">${escapeHtml(draft.germanSummary || "")}</textarea>
      </label>
      <p class="hint">${escapeHtml(t("submit.summaryHint"))}</p>
      <div class="split">
        <label>${escapeHtml(t("submit.category"))}
          <select name="category" required>${options(CATEGORIES, draft.category, t("submit.choose"), "cat.")}</select>
        </label>
        <label>${escapeHtml(t("submit.location"))}
          <select name="location" required>${options(LOCATIONS, draft.location, t("submit.choose"), "loc.")}</select>
        </label>
      </div>
      <fieldset class="quiet">
        <legend>${escapeHtml(t("submit.savings"))}</legend>
        <p class="hint">${escapeHtml(t("submit.savingsHint"))}</p>
        <div class="split">
          <label>${escapeHtml(t("submit.from"))}<input name="savingsMin" inputmode="decimal" value="${escapeHtml(draft.savingsMin)}"></label>
          <label>${escapeHtml(t("submit.to"))}<input name="savingsMax" inputmode="decimal" value="${escapeHtml(draft.savingsMax)}"></label>
        </div>
      </fieldset>
      <label>${escapeHtml(t("submit.effort"))}
        <select name="effort" required>${options(EFFORTS, draft.effort, t("submit.choose"), "effort.")}</select>
      </label>
      <fieldset class="quiet">
        <legend>${escapeHtml(t("submit.voluntary"))}</legend>
        <p class="hint">${escapeHtml(t("submit.voluntaryHint"))}</p>
        <div class="split three">
          <label>${escapeHtml(t("submit.profession"))}<select name="profession">${options(PROFESSIONS, draft.profession || "keine", "", "prof.")}</select></label>
          <label>${escapeHtml(t("submit.age"))}<select name="ageGroup">${options(AGE_GROUPS, draft.ageGroup || "keine", "", "age.")}</select></label>
          <label>${escapeHtml(t("submit.tenure"))}<select name="tenure">${options(TENURES, draft.tenure || "keine", "", "tenure.")}</select></label>
          <label>${escapeHtml(t("submit.gender"))}<select name="gender">${options(GENDERS, draft.gender || "keine", "", "gender.")}</select></label>
          <label>${escapeHtml(t("submit.origin"))}<select name="homeArea">${options(HOME_AREAS, draft.homeArea || "keine", "", "home.")}</select></label>
        </div>
      </fieldset>
      <label class="check"><input type="checkbox" name="freshPseudonym" ${draft.freshPseudonym ? "checked" : ""}> ${escapeHtml(t("submit.fresh"))}</label>
      <p class="hint">${escapeHtml(t("submit.freshHint"))}</p>
      <p class="inline-warning"><strong>${escapeHtml(t("banner.warning"))}</strong></p>
      <button class="button" type="submit">${escapeHtml(t("submit.send"))}</button>
    </form>`;
}

export function myPage(ideas) {
  const news = ideas.filter((idea) => idea.unread).length;
  return `
    <h1>${escapeHtml(t("mine.title"))}</h1>
    <p class="lede">${escapeHtml(t("mine.lede"))}${news ? ` ${escapeHtml(t("mine.badge", { n: news }))}` : ""}</p>
    ${ideas.length ? ideaCards(ideas) : `<p class="empty">${escapeHtml(t("mine.empty"))}</p>`}`;
}

export function moderationPage({ user, queue, selected, draft, candidates }) {
  const intro = user.role === "admin" ? t("mod.introAll") : t("mod.introAreas", { areas: user.areaLabels.join(", ") });
  const overdue = queue.filter((idea) => idea.due?.state === "open" && idea.due.days < 0).length;
  const overdueText = overdue === 0 ? t("mod.noneOverdue") : overdue === 1 ? t("mod.overdueOne") : t("mod.overdueMany", { n: overdue });
  const rejecting = draft?.status === "abgelehnt";
  return `
    <h1>${escapeHtml(t("mod.title"))}</h1>
    <p class="lede">${escapeHtml(intro)} ${escapeHtml(overdueText)}</p>
    ${user.role === "admin" ? `<label class="check"><input type="checkbox" id="premod" ${user.premoderation ? "checked" : ""}> ${escapeHtml(t("mod.premod"))}</label>` : ""}
    <p class="hint">${escapeHtml(t("mod.hint"))}</p>
    <div class="mod-layout">
      <div class="queue" aria-label="${escapeHtml(t("mod.queue"))}">
        ${queue.map((idea) => `
          <a class="queue-item" href="#/moderation/${escapeHtml(idea.id)}" ${selected && selected.id === idea.id ? 'aria-current="true"' : ""}>
            <span class="queue-title">${escapeHtml(idea.title)}</span>
            <span class="queue-meta">${escapeHtml(t(`cat.${idea.category}`))} · ${escapeHtml(t(`status.${idea.status}`))}${dueInfo(idea.due) ? ` · ${escapeHtml(t(dueInfo(idea.due).key, { n: dueInfo(idea.due).n }))}` : ""}</span>
          </a>`).join("")}
        ${queue.length === 0 ? `<p class="empty">${escapeHtml(t("mod.empty"))}</p>` : ""}
      </div>
      <div>
        ${selected && draft ? `
          <article class="card">
            <div class="card-top"><h2>${escapeHtml(selected.title)}</h2>${badgeStatus(selected)}</div>
            <p class="meta">${escapeHtml(t(`loc.${selected.location}`))} · ${escapeHtml(selected.authorPseudonym)} · ${escapeHtml(formatDate(selected.createdAt, intlLocale()))}</p>
            ${dueLine(selected)}
            <p>${escapeHtml(excerpt(selected.description, 280))}</p>
            <p><a href="#/ideen/${escapeHtml(selected.id)}">${escapeHtml(t("mod.read"))}</a></p>
            <form id="mod-form" class="stack">
              <p id="form-error" class="field-error" role="alert"></p>
              <label>${escapeHtml(t("mod.status"))}<select name="status">${options(STATUSES, draft.status, "", "status.")}</select></label>
              <p class="hint">${escapeHtml(t("mod.path"))}</p>
              <label>${escapeHtml(t("mod.area"))}<select name="category">${options(CATEGORIES, draft.category, "", "cat.")}</select></label>
              <p class="hint">${escapeHtml(t("mod.areaHint"))}</p>
              <div id="feedback-block" ${rejecting ? "hidden" : ""}>
                <label>${escapeHtml(t("mod.feedback"))}<textarea name="feedback" maxlength="2000">${escapeHtml(draft.feedback || "")}</textarea></label>
              </div>
              <div id="reject-block" ${rejecting ? "" : "hidden"}>
                <p class="thanks-template">${escapeHtml(t("mod.thanks"))}</p>
                <p class="hint">${escapeHtml(t("mod.thanksHint"))}</p>
                <label>${escapeHtml(t("mod.reason"))}<textarea name="reason" maxlength="2000">${escapeHtml(draft.reason || "")}</textarea></label>
              </div>
              <p class="conduct-live field-error" role="status"></p>
              <label>${escapeHtml(t("mod.realized"))}<input name="realizedSavings" inputmode="decimal" value="${escapeHtml(draft.realizedSavings || "")}"></label>
              <label>${escapeHtml(t("mod.merge"))}
                <select name="mergedIntoId">
                  <option value="">${escapeHtml(t("mod.mergeNone"))}</option>
                  ${candidates.map((idea) => `<option value="${escapeHtml(idea.id)}"${idea.id === draft.mergedIntoId ? " selected" : ""}>${escapeHtml(idea.title)}</option>`).join("")}
                </select>
              </label>
              <label>${escapeHtml(t("mod.translation"))}<textarea name="translationDe" maxlength="4000">${escapeHtml(draft.translationDe || "")}</textarea></label>
              <p class="hint">${escapeHtml(t("mod.translationHint"))}</p>
              <button class="button" type="submit">${escapeHtml(t("mod.save"))}</button>
            </form>
          </article>` : `<p class="empty">${escapeHtml(t("mod.pick"))}</p>`}
      </div>
    </div>`;
}

function barRows(rows, prefix, masked = false) {
  return rows.map((row) => `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(prefix ? t(`${prefix}${row.id}`) : row.label)}</div>
      <div class="bar-track${masked && row.suppressed ? " is-masked" : ""}">${!masked || !row.suppressed ? `<span data-w="${Number(row.bar) || 0}"></span>` : ""}</div>
      <div class="bar-value">${escapeHtml(masked ? row.display : String(row.count))}</div>
    </div>`).join("");
}

export function statsPage(stats) {
  return `
    <h1>${escapeHtml(t("stats.title"))}</h1>
    <p class="lede">${escapeHtml(t("stats.lede"))}</p>
    ${stats.viewerRole === "admin" ? `<label class="check"><input type="checkbox" id="premod" ${stats.premoderation ? "checked" : ""}> ${escapeHtml(t("mod.premod"))}</label>` : ""}
    <div class="kpis">
      <article class="kpi"><p class="kpi-label">${escapeHtml(t("stats.ideas"))}</p><p class="kpi-value">${stats.activeIdeas}</p></article>
      <article class="kpi"><p class="kpi-label">${escapeHtml(t("stats.estimated"))}</p><p class="kpi-value">${escapeHtml(formatEuro(stats.estimatedSavings, intlLocale()))}</p></article>
      <article class="kpi"><p class="kpi-label">${escapeHtml(t("stats.pipeline"))}</p><p class="kpi-value">${escapeHtml(formatEuro(stats.pipelineSavings, intlLocale()))}</p></article>
      <article class="kpi"><p class="kpi-label">${escapeHtml(t("stats.realized"))}</p><p class="kpi-value">${escapeHtml(formatEuro(stats.realizedSavings, intlLocale()))}</p></article>
    </div>
    <p class="hint">${escapeHtml(t("stats.supports", { n: stats.supportTotal }))}</p>
    <div class="stat-grid">
      <section><h2>${escapeHtml(t("stats.byCategory"))}</h2>${barRows(stats.byCategory, "cat.")}${stats.emptyCategories.length ? `<p class="hint">${escapeHtml(t("stats.emptyCats"))}: ${escapeHtml(stats.emptyCategories.join(", "))}.</p>` : ""}</section>
      <section><h2>${escapeHtml(t("stats.byLocation"))}</h2>${barRows(stats.byLocation, "loc.")}</section>
    </div>
    <section>
      <h2>${escapeHtml(t("stats.byStatus"))}</h2>
      ${barRows(stats.byStatus, "status.")}
    </section>
    <section class="demographic">
      <h2>${escapeHtml(t("stats.demoTitle"))}</h2>
      <p class="hint">${escapeHtml(t("stats.demoHint"))}</p>
      <div class="stat-grid">
        <section><h3>${escapeHtml(t("stats.profession"))}</h3>${barRows(stats.byProfession, "prof.", true)}</section>
        <section><h3>${escapeHtml(t("stats.gender"))}</h3>${barRows(stats.byGender, "gender.", true)}</section>
        <section><h3>${escapeHtml(t("stats.age"))}</h3>${barRows(stats.byAge, "age.", true)}</section>
        <section><h3>${escapeHtml(t("stats.tenure"))}</h3>${barRows(stats.byTenure, "tenure.", true)}</section>
        <section><h3>${escapeHtml(t("stats.origin"))}</h3>${barRows(stats.byHomeArea, "home.", true)}</section>
      </div>
    </section>`;
}

export function loginPage() {
  return `
    <div class="login-grid">
      <section>
        <h1>${escapeHtml(t("login.title"))}</h1>
        <p class="lede">${escapeHtml(t("login.lede"))}</p>
        <p><a class="button secondary" href="#/sparen">${escapeHtml(t("nav.savings"))}</a></p>
        <h2>${escapeHtml(t("login.pseudoTitle"))}</h2>
        <p>${escapeHtml(t("login.pseudo1"))}</p>
        <p>${escapeHtml(t("login.pseudo2"))}</p>
        <p><a href="#/hinweise">${escapeHtml(t("nav.help"))}</a></p>
      </section>
      <section class="card">
        <h2>${escapeHtml(t("login.heading"))}</h2>
        <p class="hint">${escapeHtml(t("login.accounts"))}</p>
        <ul class="accounts">
          <li><code>mitarbeiter</code> / <code>demo</code></li>
          <li><code>moderation</code> / <code>demo</code></li>
          <li><code>admin</code> / <code>demo</code></li>
        </ul>
        <form id="login-form" class="stack" autocomplete="off">
          <p id="form-error" class="field-error" role="alert"></p>
          <label>${escapeHtml(t("login.user"))}<input name="username" autocomplete="username" required placeholder="mitarbeiter"></label>
          <label>${escapeHtml(t("login.password"))}<input name="password" type="password" autocomplete="current-password" required placeholder="demo"></label>
          <button class="button" type="submit">${escapeHtml(t("login.submit"))}</button>
        </form>
      </section>
    </div>`;
}

export function helpPage() {
  const sections = ["purpose", "proto", "login", "pseudo", "who", "sparse", "dup", "sla", "status", "protect", "answers", "prize", "next"];
  return `
    <h1>${escapeHtml(t("help.title"))}</h1>
    ${sections.map((id) => `<section><h2>${escapeHtml(t(`help.${id}.title`))}</h2><p>${escapeHtml(t(`help.${id}.body`))}</p></section>`).join("")}`;
}

export function savingsPage(texts, code) {
  const entry = texts[code] || texts.de;
  const preferred = ["de", "en", "tr", "ro", "hr", "pl", "uk", "ar"];
  const ids = [...preferred.filter((id) => texts[id]), ...Object.keys(texts).filter((id) => !preferred.includes(id))];
  const select = ids.map((id) => `<option value="${escapeHtml(id)}"${id === (texts[code] ? code : "de") ? " selected" : ""}>${escapeHtml(texts[id].sprache)}</option>`).join("");
  const local = t("savings.notice");
  const extra = local !== SAVINGS_NOTICE ? `<p>${escapeHtml(local)}</p>` : "";
  return `
    <h1>${escapeHtml(t("savings.heading"))}</h1>
    <p class="lede">${escapeHtml(t("savings.intro"))}</p>
    <label class="savings-pick">${escapeHtml(t("savings.pick"))}
      <select id="savings-lang">${select}</select>
    </label>
    <div class="machine-notice" role="note"><strong>${escapeHtml(SAVINGS_NOTICE)}</strong>${extra}</div>
    <article class="savings-text" lang="${escapeHtml(entry === texts[code] ? code : "de")}" dir="${entry.rtl ? "rtl" : "ltr"}">
      <h2>${escapeHtml(entry.titel)}</h2>
      <p>${escapeHtml(entry.text)}</p>
    </article>`;
}

export function messagePage(title, text, href, hrefLabel) {
  return `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p>${href ? `<p><a href="${escapeHtml(href)}">${escapeHtml(hrefLabel)}</a></p>` : ""}`;
}

export function layout({ user, active, flash, content }) {
  const items = [];
  if (user) {
    items.push(["ideen", t("nav.ideas"), "#/ideen", 0]);
    items.push(["einreichen", t("nav.submit"), "#/einreichen", 0]);
    items.push(["meine", t("nav.mine"), "#/meine", user.unreadCount || 0]);
    if (user.role !== "mitarbeit") items.push(["moderation", t("nav.moderation"), "#/moderation", 0]);
    if (user.role === "admin") items.push(["auswertung", t("nav.stats"), "#/auswertung", 0]);
  }
  items.push(["sparen", t("nav.savings"), "#/sparen", 0]);
  items.push(["hinweise", t("nav.help"), "#/hinweise", 0]);
  if (!user) items.push(["anmelden", t("nav.login"), "#/anmelden", 0]);
  const nav = items.map(([id, label, href, badge]) => `<a href="${href}"${active === id ? ' aria-current="page"' : ""}>${escapeHtml(label)}${badge ? `<span class="nav-badge">${badge}</span>` : ""}</a>`).join("");
  const lang = `<label class="lang-pick">${escapeHtml(t("common.language"))}<select id="lang">${UI_LANGS.map((item) => `<option value="${item.id}"${item.id === getLocale() ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>`;
  const who = user ? `<div class="who"><div><p class="who-name">${escapeHtml(user.pseudonym)}</p><p class="who-role">${escapeHtml(t(`role.${user.role}`))}</p></div><button type="button" class="button secondary small" id="logout">${escapeHtml(t("nav.logout"))}</button></div>` : "";
  const flashHtml = flash ? `<p class="flash ${flash.type === "error" ? "error" : "ok"}" role="status">${escapeHtml(flash.text || t(flash.code, flash.vars))}</p>` : "";
  return `
    <header class="site-header">
      <div class="wrap header-row">
        <a class="brand" href="${user ? "#/ideen" : "#/anmelden"}"><span class="brand-mark" aria-hidden="true">IB</span><span><span class="brand-title">Ideenbox</span><span class="brand-sub">${escapeHtml(t("brand.sub"))}</span></span></a>
        <div class="header-tools">${lang}${who}</div>
      </div>
      <p class="machine-line wrap">${escapeHtml(t("banner.machine"))}</p>
      <nav class="wrap nav" aria-label="${escapeHtml(t("nav.label"))}">${nav}</nav>
    </header>
    <main id="inhalt"><div class="wrap">${flashHtml}${content}</div></main>
    <footer class="site-footer"><div class="wrap footer-row"><p>${escapeHtml(t("footer.sites"))}</p><button type="button" class="button secondary" id="reset">${escapeHtml(t("footer.reset"))}</button></div></footer>`;
}
