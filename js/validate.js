import { AGE_GROUPS, CATEGORIES, EFFORTS, GENDERS, HOME_AREAS, LOCATIONS, PROFESSIONS, STATUSES, TENURES, UI_LANGS } from "./config.js";
import { inspectConduct } from "./conduct.js";
import { parseEuro } from "./format.js";

function member(list, id) {
  return list.some((item) => item.id === id);
}

export function validateIdeaInput(input) {
  const fields = {};
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  if (title.length < 8) fields.title = "title-short";
  if (title.length > 140) fields.title = "title-long";
  if (description.length < 20) fields.description = "description-short";
  if (description.length > 4000) fields.description = "description-long";
  if (!member(CATEGORIES, input.category)) fields.category = "category";
  if (!member(LOCATIONS, input.location)) fields.location = "location";
  if (!member(EFFORTS, input.effort)) fields.effort = "effort";
  if (!member(UI_LANGS, input.language || "de")) fields.language = "language";

  const savingsMin = parseEuro(input.savingsMin);
  const savingsMax = parseEuro(input.savingsMax);
  if (Number.isNaN(savingsMin)) fields.savingsMin = "money";
  if (Number.isNaN(savingsMax)) fields.savingsMax = "money";
  if (!Number.isNaN(savingsMin) && !Number.isNaN(savingsMax) && savingsMin != null && savingsMax != null && savingsMin > savingsMax) {
    fields.savingsMax = "money-range";
  }

  const profession = input.profession || "keine";
  const ageGroup = input.ageGroup || "keine";
  const tenure = input.tenure || "keine";
  const gender = input.gender || "keine";
  const homeArea = input.homeArea || "keine";
  if (!member(PROFESSIONS, profession)) fields.profession = "profession";
  if (!member(AGE_GROUPS, ageGroup)) fields.ageGroup = "age";
  if (!member(TENURES, tenure)) fields.tenure = "tenure";
  if (!member(GENDERS, gender)) fields.gender = "gender";
  if (!member(HOME_AREAS, homeArea)) fields.homeArea = "home";
  const germanSummary = String(input.germanSummary || "").trim();
  if (germanSummary.length > 500) fields.germanSummary = "summary-long";
  const conduct = inspectConduct(`${title}\n${description}\n${germanSummary}`);
  if (conduct.person) fields.description = fields.description || "person";
  if (conduct.insult) fields.description = fields.description || "insult";

  return {
    ok: Object.keys(fields).length === 0,
    fields,
    value: {
      title,
      description,
      category: input.category,
      location: input.location,
      effort: input.effort,
      savingsMin: Number.isNaN(savingsMin) ? null : savingsMin,
      savingsMax: Number.isNaN(savingsMax) ? null : savingsMax,
      profession,
      ageGroup,
      tenure,
      gender,
      homeArea,
      language: input.language || "de",
      germanSummary,
      freshPseudonym: Boolean(input.freshPseudonym),
    },
  };
}

export function validateComment(text) {
  const value = String(text || "").trim();
  if (value.length < 2) return { ok: false, code: "comment-short" };
  if (value.length > 1000) return { ok: false, code: "comment-long" };
  const conduct = inspectConduct(value);
  if (conduct.person) return { ok: false, code: "person" };
  if (conduct.insult) return { ok: false, code: "insult" };
  return { ok: true, value };
}

export function validateModeration(input, context) {
  const fields = {};
  const status = input.status;
  const category = input.category;
  const reason = String(input.reason || "").trim();
  const thanks = String(input.thanks || "").trim();
  const feedback = status === "abgelehnt"
    ? `${thanks}\n\n${reason}`.trim()
    : String(input.feedback || "").trim();
  const mergedIntoId = String(input.mergedIntoId || "").trim();
  const translationDe = String(input.translationDe || "").trim();
  const realizedRaw = parseEuro(input.realizedSavings);

  if (!member(STATUSES, status)) fields.status = "status";
  if (!member(CATEGORIES, category)) fields.category = "category";
  if (Number.isNaN(realizedRaw)) fields.realizedSavings = "money";

  if (status === "abgelehnt") {
    if (thanks.length < 10) fields.thanks = "thanks";
    if (reason.length < 20) fields.reason = "reject-reason";
    if (inspectConduct(reason).person || inspectConduct(thanks).person) fields.reason = "person";
    if (inspectConduct(reason).insult) fields.reason = "insult";
  } else {
    const needsText = status === "zusammengefuehrt" || status === "angenommen" || status === "umgesetzt";
    if (needsText && feedback.length < 10) fields.feedback = "feedback-short";
    if (feedback.length > 2000) fields.feedback = "feedback-long";
    if (inspectConduct(feedback).person) fields.feedback = "person";
    if (inspectConduct(feedback).insult) fields.feedback = "insult";
  }
  if (translationDe.length > 4000) fields.translationDe = "translation-long";

  if (status === "zusammengefuehrt") {
    if (!mergedIntoId) fields.mergedIntoId = "merged-missing";
    else if (mergedIntoId === context.ideaId) fields.mergedIntoId = "merged-self";
    else {
      const target = (context.ideas || []).find((idea) => idea.id === mergedIntoId);
      if (!target) fields.mergedIntoId = "merged-missing";
      else if (target.status === "zusammengefuehrt") fields.mergedIntoId = "merged-chain";
    }
  }

  return {
    ok: Object.keys(fields).length === 0,
    fields,
    value: {
      status,
      category,
      feedback,
      translationDe,
      mergedIntoId: status === "zusammengefuehrt" ? mergedIntoId : "",
      realizedSavings: status === "umgesetzt" && !Number.isNaN(realizedRaw) ? realizedRaw : null,
    },
  };
}
