/**
 * Nahtstelle der Ideenbox.
 *
 * Die Oberfläche spricht nur mit diesem Objekt. Der Prototyp speichert getrennt:
 * ideas (Texte, Status, Pseudonym), demographics (freiwillige Statistik),
 * identity (Zugang ↔ Pseudonym, später Vertrauensstelle), session, settings.
 *
 * Eine echte Version ersetzt createRepository(localStorage) in js/app.js
 * durch ein HTTP-Repository mit denselben Methoden. Hosting in Deutschland,
 * Anmeldung über das Klinik-Login. Kein externer Übersetzungsdienst.
 *
 * Methoden: currentUser, login, logout, listIdeas, getIdea, createIdea,
 * supportIdea, addComment, reportComment, setCommentStatus, moderateIdea,
 * similarIdeas, adminStats, setPremoderation, markSeen, resetDemoData.
 */

import { ANIMALS, CATEGORIES, DEMO_USERS, EFFORTS, LOCATIONS, ROLE_LABELS, STATUSES, STORAGE_PREFIX, labelOf } from "./config.js";
import { DEMO_IDEAS, DEMO_PROFILE } from "./demo-data.js";
import { feedbackDue } from "./format.js";
import { findSimilar } from "./similarity.js";
import { buildStats } from "./stats.js";
import { validateComment, validateIdeaInput, validateModeration } from "./validate.js";

const KEY = {
  ideas: `${STORAGE_PREFIX}.ideas`,
  demographics: `${STORAGE_PREFIX}.demographics`,
  identity: `${STORAGE_PREFIX}.identity`,
  session: `${STORAGE_PREFIX}.session`,
  settings: `${STORAGE_PREFIX}.settings`,
};

const SENSITIVE = ["profession", "experience", "gender", "ageGroup", "tenure", "homeArea"];

function fail(code, fields) {
  const error = new Error(code);
  error.code = code;
  if (fields) error.fields = fields;
  return error;
}

function readJson(storage, key, fallback) {
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function seedFromDemo() {
  const ideas = [];
  const demographics = {};
  for (const raw of DEMO_IDEAS) {
    const full = {
      language: "de",
      germanSummary: "",
      translationDe: "",
      ...raw,
      ...(DEMO_PROFILE[raw.id] || {}),
    };
    const idea = { ...full };
    const stats = {};
    for (const key of SENSITIVE) {
      stats[key] = idea[key] || "keine";
      delete idea[key];
    }
    ideas.push(idea);
    demographics[idea.id] = {
      profession: stats.profession,
      gender: stats.gender,
      ageGroup: stats.ageGroup,
      tenure: stats.tenure,
      homeArea: stats.homeArea,
    };
  }
  return { ideas, demographics };
}

function generatePseudonym(used, random) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const animalIndex = Math.min(ANIMALS.length - 1, Math.floor(random() * ANIMALS.length));
    const number = 1000 + Math.floor(random() * 9000);
    const name = `Idee-${ANIMALS[animalIndex]}-${number}`;
    if (!used.has(name)) return name;
  }
  return `Idee-Gast-${1000 + Math.floor(random() * 9000)}`;
}

function ownedNames(account) {
  const names = new Set([account.pseudonym]);
  for (const name of Object.values(account.pseudonymByIdea || {})) names.add(name);
  return names;
}

function latestOtherActivity(idea, account) {
  const times = [];
  if (idea.feedbackAt) times.push(idea.feedbackAt);
  for (const comment of idea.comments || []) {
    const status = comment.status || "visible";
    if (status === "hidden" || status === "pending") continue;
    if (ownedNames(account).has(comment.pseudonym)) continue;
    times.push(comment.createdAt);
  }
  return times.sort().at(-1) || null;
}

function isUnread(idea, account) {
  if (!ownedNames(account).has(idea.authorPseudonym)) return false;
  const latest = latestOtherActivity(idea, account);
  if (!latest) return false;
  const seen = account.seenAt?.[idea.id];
  return !seen || latest > seen;
}

export function canModerate(user, idea) {
  if (!user || !idea) return false;
  if (user.role === "admin") return true;
  if (user.role !== "moderation") return false;
  return user.areas.includes(idea.category);
}

function toPublicUser(account, extras = {}) {
  return {
    username: account.username,
    role: account.role,
    roleLabel: ROLE_LABELS[account.role] || account.role,
    areas: account.areas.slice(),
    areaLabels: account.areas.map((id) => labelOf(CATEGORIES, id)),
    pseudonym: account.pseudonym,
    rulesAccepted: Boolean(account.rulesAccepted),
    firstLogin: Boolean(extras.firstLogin),
    unreadCount: extras.unreadCount || 0,
    premoderation: Boolean(extras.premoderation),
  };
}

function toPublicIdea(idea, ideas, account, nowIso, settings) {
  const user = account ? toPublicUser(account) : null;
  const staff = user && (user.role === "admin" || user.role === "moderation");
  const owned = account ? ownedNames(account) : new Set();
  const mergedTarget = idea.mergedIntoId ? ideas.find((item) => item.id === idea.mergedIntoId) : null;
  const comments = (idea.comments || [])
    .filter((comment) => {
      const status = comment.status || "visible";
      if (status === "hidden") return staff;
      if (status === "pending") return staff || owned.has(comment.pseudonym);
      return true;
    })
    .map((comment) => ({
      id: comment.id,
      pseudonym: comment.pseudonym,
      text: comment.text,
      createdAt: comment.createdAt,
      status: comment.status || "visible",
      reportCount: staff ? (comment.reports || []).length : 0,
      reportedByMe: Boolean(account && (comment.reports || []).includes(account.pseudonym)),
      mine: owned.has(comment.pseudonym),
    }));
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    category: idea.category,
    categoryLabel: labelOf(CATEGORIES, idea.category),
    location: idea.location,
    locationLabel: labelOf(LOCATIONS, idea.location),
    savingsMin: idea.savingsMin ?? null,
    savingsMax: idea.savingsMax ?? null,
    effort: idea.effort,
    effortLabel: labelOf(EFFORTS, idea.effort),
    authorPseudonym: idea.authorPseudonym,
    createdAt: idea.createdAt,
    status: idea.status,
    statusLabel: labelOf(STATUSES, idea.status),
    feedback: idea.feedback || "",
    feedbackAt: idea.feedbackAt || null,
    rejectionReason: idea.rejectionReason || "",
    mergedIntoId: idea.mergedIntoId || null,
    mergedInto: mergedTarget ? { id: mergedTarget.id, title: mergedTarget.title } : null,
    mergedFrom: ideas.filter((item) => item.mergedIntoId === idea.id).map((item) => ({ id: item.id, title: item.title })),
    realizedSavings: idea.realizedSavings ?? null,
    supportCount: (idea.supports || []).length,
    supportedByMe: Boolean(account && (idea.supports || []).includes(account.pseudonym)),
    supporters: (idea.supports || []).slice(),
    comments,
    origin: idea.origin || "demo",
    language: idea.language || "de",
    germanSummary: idea.germanSummary || "",
    translationDe: idea.translationDe || "",
    due: feedbackDue(idea, nowIso),
    mine: Boolean(account && owned.has(idea.authorPseudonym)),
    unread: Boolean(account && isUnread(idea, account)),
    premoderation: Boolean(settings.premoderation),
  };
}

export function createRepository(storage, options = {}) {
  const now = options.now || (() => new Date().toISOString());
  const random = options.random || Math.random;

  function ensureSeed() {
    if (!storage.getItem(KEY.ideas)) {
      const seed = seedFromDemo();
      writeJson(storage, KEY.ideas, seed.ideas);
      writeJson(storage, KEY.demographics, seed.demographics);
    }
    if (!storage.getItem(KEY.identity)) writeJson(storage, KEY.identity, {});
    if (!storage.getItem(KEY.settings)) writeJson(storage, KEY.settings, { premoderation: false });
  }

  function readIdeas() {
    ensureSeed();
    return readJson(storage, KEY.ideas, []);
  }
  function writeIdeas(ideas) {
    writeJson(storage, KEY.ideas, ideas);
  }
  function readDemographics() {
    ensureSeed();
    return readJson(storage, KEY.demographics, {});
  }
  function readIdentity() {
    ensureSeed();
    return readJson(storage, KEY.identity, {});
  }
  function readSettings() {
    ensureSeed();
    return readJson(storage, KEY.settings, { premoderation: false });
  }

  function currentAccount() {
    const session = readJson(storage, KEY.session, null);
    if (!session?.username) return null;
    return readIdentity()[session.username] || null;
  }

  function requireUser() {
    const account = currentAccount();
    if (!account) throw fail("need-auth");
    return account;
  }

  function usedPseudonyms(ideas, identity) {
    const used = new Set();
    for (const idea of ideas) {
      used.add(idea.authorPseudonym);
      for (const pseudonym of idea.supports || []) used.add(pseudonym);
      for (const comment of idea.comments || []) used.add(comment.pseudonym);
    }
    for (const account of Object.values(identity)) {
      used.add(account.pseudonym);
      for (const name of Object.values(account.pseudonymByIdea || {})) used.add(name);
    }
    return used;
  }

  function newId(prefix, existing) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const id = `${prefix}-${Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0")}`;
      if (!existing.has(id)) return id;
    }
    return `${prefix}-${Date.now().toString(36)}`;
  }

  function publish(account) {
    const ideas = readIdeas();
    const settings = readSettings();
    const unreadCount = account ? ideas.filter((idea) => isUnread(idea, account)).length : 0;
    return {
      user: account ? toPublicUser(account, { unreadCount, premoderation: settings.premoderation }) : null,
      ideas: ideas.map((idea) => toPublicIdea(idea, ideas, account, now(), settings)),
      settings,
    };
  }

  async function currentUser() {
    return publish(currentAccount()).user;
  }

  async function login({ username, password }) {
    const name = String(username || "").trim().toLowerCase();
    const demo = DEMO_USERS.find((item) => item.username === name);
    if (!demo || String(password || "").trim() !== demo.password) throw fail("bad-login");
    const identity = readIdentity();
    let firstLogin = false;
    if (!identity[demo.username]) {
      firstLogin = true;
      identity[demo.username] = {
        username: demo.username,
        role: demo.role,
        areas: demo.areas.slice(),
        pseudonym: demo.pseudonym,
        createdAt: now(),
        rulesAccepted: false,
        seenAt: {},
        pseudonymByIdea: {},
      };
      writeJson(storage, KEY.identity, identity);
    }
    writeJson(storage, KEY.session, { username: demo.username });
    const user = publish(identity[demo.username]).user;
    user.firstLogin = firstLogin;
    return user;
  }

  async function logout() {
    storage.removeItem(KEY.session);
  }

  async function listIdeas() {
    const account = requireUser();
    return publish(account).ideas;
  }

  async function getIdea(id) {
    const ideas = await listIdeas();
    return ideas.find((idea) => idea.id === id) || null;
  }

  async function createIdea(input) {
    const account = requireUser();
    const result = validateIdeaInput(input);
    if (!result.ok) throw fail("fields", result.fields);
    const ideas = readIdeas();
    const demographics = readDemographics();
    const identity = readIdentity();
    const id = newId("idea", new Set(ideas.map((idea) => idea.id)));
    let authorPseudonym = account.pseudonym;
    if (result.value.freshPseudonym) {
      authorPseudonym = generatePseudonym(usedPseudonyms(ideas, identity), random);
      account.pseudonymByIdea = account.pseudonymByIdea || {};
      account.pseudonymByIdea[id] = authorPseudonym;
      identity[account.username] = account;
      writeJson(storage, KEY.identity, identity);
    }
    const { profession, ageGroup, tenure, gender, homeArea, freshPseudonym, ...rest } = result.value;
    ideas.push({
      ...rest,
      id,
      authorPseudonym,
      createdAt: now(),
      status: "eingereicht",
      supports: [],
      comments: [],
      feedback: "",
      feedbackAt: null,
      feedbackBy: null,
      rejectionReason: "",
      mergedIntoId: null,
      realizedSavings: null,
      translationDe: "",
      origin: "local",
    });
    demographics[id] = { profession, ageGroup, tenure, gender, homeArea };
    writeIdeas(ideas);
    writeJson(storage, KEY.demographics, demographics);
    return publish(account).ideas.find((idea) => idea.id === id);
  }

  async function supportIdea(id) {
    const account = requireUser();
    const ideas = readIdeas();
    const idea = ideas.find((item) => item.id === id);
    if (!idea) throw fail("not-found");
    if (idea.status === "zusammengefuehrt") throw fail("merged-support");
    idea.supports = idea.supports || [];
    if (idea.supports.includes(account.pseudonym)) return { already: true, supportCount: idea.supports.length };
    idea.supports.push(account.pseudonym);
    writeIdeas(ideas);
    return { already: false, supportCount: idea.supports.length };
  }

  async function addComment(id, text, acceptRules = false) {
    const account = requireUser();
    if (!account.rulesAccepted) {
      if (!acceptRules) throw fail("rules");
      account.rulesAccepted = true;
      const identity = readIdentity();
      identity[account.username] = account;
      writeJson(storage, KEY.identity, identity);
    }
    const result = validateComment(text);
    if (!result.ok) throw fail(result.code);
    const ideas = readIdeas();
    const idea = ideas.find((item) => item.id === id);
    if (!idea) throw fail("not-found");
    idea.comments = idea.comments || [];
    const settings = readSettings();
    const comment = {
      id: newId("kom", new Set(idea.comments.map((item) => item.id))),
      pseudonym: account.pseudonym,
      text: result.value,
      createdAt: now(),
      status: settings.premoderation ? "pending" : "visible",
      reports: [],
    };
    idea.comments.push(comment);
    writeIdeas(ideas);
    return { ...comment, pending: comment.status === "pending" };
  }

  async function reportComment(ideaId, commentId) {
    const account = requireUser();
    const ideas = readIdeas();
    const idea = ideas.find((item) => item.id === ideaId);
    const comment = idea?.comments?.find((item) => item.id === commentId);
    if (!comment) throw fail("not-found");
    comment.reports = comment.reports || [];
    if (!comment.reports.includes(account.pseudonym)) comment.reports.push(account.pseudonym);
    writeIdeas(ideas);
    return { reportCount: comment.reports.length };
  }

  async function setCommentStatus(ideaId, commentId, status) {
    const account = requireUser();
    const ideas = readIdeas();
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) throw fail("not-found");
    if (!canModerate(toPublicUser(account), idea)) throw fail("wrong-area");
    const comment = idea.comments?.find((item) => item.id === commentId);
    if (!comment) throw fail("not-found");
    if (!["visible", "hidden", "pending"].includes(status)) throw fail("status");
    comment.status = status;
    writeIdeas(ideas);
    return { status };
  }

  async function moderateIdea(id, input) {
    const account = requireUser();
    const ideas = readIdeas();
    const idea = ideas.find((item) => item.id === id);
    if (!idea) throw fail("not-found");
    if (!canModerate(toPublicUser(account), idea)) throw fail("wrong-area");
    const result = validateModeration(input, { ideaId: id, ideas });
    if (!result.ok) throw fail("fields", result.fields);
    idea.status = result.value.status;
    idea.category = result.value.category;
    idea.feedback = result.value.feedback;
    idea.translationDe = result.value.translationDe;
    idea.rejectionReason = result.value.status === "abgelehnt" ? result.value.feedback : "";
    idea.mergedIntoId = result.value.status === "zusammengefuehrt" ? result.value.mergedIntoId : null;
    idea.realizedSavings = result.value.status === "umgesetzt" ? result.value.realizedSavings : null;
    if (result.value.feedback) {
      idea.feedbackAt = now();
      idea.feedbackByRole = account.role;
    } else {
      idea.feedbackAt = null;
      idea.feedbackByRole = null;
    }
    writeIdeas(ideas);
    return publish(account).ideas.find((item) => item.id === id);
  }

  async function similarIdeas(title, description, language) {
    const ideas = await listIdeas();
    const sameLanguage = ideas.filter((idea) => (idea.language || "de") === (language || "de"));
    return findSimilar(title, description, sameLanguage);
  }

  async function adminStats() {
    const account = requireUser();
    if (account.role !== "admin") throw fail("admin-only");
    return buildStats(readIdeas(), readDemographics());
  }

  async function setPremoderation(enabled) {
    const account = requireUser();
    if (account.role !== "admin") throw fail("admin-only");
    const settings = readSettings();
    settings.premoderation = Boolean(enabled);
    writeJson(storage, KEY.settings, settings);
    return settings;
  }

  async function markSeen(id) {
    const account = requireUser();
    account.seenAt = account.seenAt || {};
    account.seenAt[id] = now();
    const identity = readIdentity();
    identity[account.username] = account;
    writeJson(storage, KEY.identity, identity);
    return publish(account).user;
  }

  async function resetDemoData() {
    storage.removeItem(KEY.ideas);
    storage.removeItem(KEY.demographics);
    storage.removeItem(KEY.identity);
    storage.removeItem(KEY.session);
    storage.removeItem(KEY.settings);
    ensureSeed();
  }

  return {
    currentUser,
    login,
    logout,
    listIdeas,
    getIdea,
    createIdea,
    supportIdea,
    addComment,
    reportComment,
    setCommentStatus,
    moderateIdea,
    similarIdeas,
    adminStats,
    setPremoderation,
    markSeen,
    resetDemoData,
  };
}
