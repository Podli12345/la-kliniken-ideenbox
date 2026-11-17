import assert from "node:assert/strict";
import fs from "node:fs";
import { DEMO_IDEAS } from "../js/demo-data.js";
import { findSimilar } from "../js/similarity.js";
import { anonymizeGroups } from "../js/stats.js";
import { namesPerson, findInsult } from "../js/conduct.js";
import { createRepository } from "../js/repository.js";
import { PROTOTYPE_WARNING, SAVINGS_NOTICE } from "../js/config.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function fresh() {
  return createRepository(memoryStorage(), { now: () => "2026-11-16T12:00:00+01:00" });
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test("Hinweistexte und relative Pfade", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, new RegExp(PROTOTYPE_WARNING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /src="js\/app\.js"/);
  assert.match(html, /href="css\/app\.css"/);
  assert.doesNotMatch(html, /src="\//);
  assert.doesNotMatch(html, /https?:\/\//);
  for (const file of fs.readdirSync("js")) {
    const source = fs.readFileSync(`js/${file}`, "utf8");
    assert.doesNotMatch(source, /https?:\/\//, file);
  }
  const css = fs.readFileSync("css/app.css", "utf8");
  assert.doesNotMatch(css, /https?:\/\//);
});

test("Spardrucktexte und Übersetzungsdateien", () => {
  const texts = JSON.parse(fs.readFileSync("data/spardruck.json", "utf8"));
  assert.equal(Object.keys(texts).length, 19);
  assert.equal(texts.ar.rtl, true);
  assert.equal(texts.de.rtl, false);
  assert.match(texts.de.text, /18,8 Millionen/);
  const de = JSON.parse(fs.readFileSync("locales/de.json", "utf8"));
  assert.equal(de.strings["banner.warning"], PROTOTYPE_WARNING);
  assert.equal(de.strings["savings.notice"], SAVINGS_NOTICE);
  assert.equal(de.strings["conduct.person"], "Bitte keine Personen nennen");
  for (const code of ["en", "tr", "ro", "hr", "pl", "uk", "ar"]) {
    const bundle = JSON.parse(fs.readFileSync(`locales/${code}.json`, "utf8"));
    assert.deepEqual(Object.keys(bundle.strings).sort(), Object.keys(de.strings).sort(), code);
  }
  assert.equal(JSON.parse(fs.readFileSync("locales/ar.json", "utf8")).dir, "rtl");
});

test("Demodaten ohne Personenmerkmale in der öffentlichen Idee", async () => {
  const repo = fresh();
  await repo.login({ username: "mitarbeiter", password: "Ideenbox-LA" });
  const ideas = await repo.listIdeas();
  assert.equal(ideas.length, 18);
  for (const idea of ideas) {
    for (const key of ["profession", "gender", "ageGroup", "tenure", "homeArea", "experience"]) {
      assert.equal(key in idea, false, key);
    }
  }
  const mine = ideas.filter((idea) => idea.mine);
  assert.deepEqual(mine.map((idea) => idea.id).sort(), ["idea-01", "idea-15"]);
  assert.ok(mine.every((idea) => idea.unread));
  const user = await repo.currentUser();
  assert.equal(user.pseudonym, "Idee-Fuchs-4821");
  assert.equal(user.unreadCount, 2);
});

test("Fristen, Ähnlichkeit nur in derselben Sprache, Schutzregeln", async () => {
  const repo = fresh();
  await repo.login({ username: "mitarbeiter", password: "Ideenbox-LA" });
  const ideas = await repo.listIdeas();
  const byId = Object.fromEntries(ideas.map((idea) => [idea.id, idea]));
  assert.equal(byId["idea-16"].due.days, -16);
  assert.equal(byId["idea-09"].due.days, 1);
  const hits = await repo.similarIdeas(
    "Einweg-Nierenschalen auf Station durch sterilisierbare Schalen ersetzen",
    "Die AEMP könnte Einweg-Nierenschalen aufbereiten.",
    "de",
  );
  assert.equal(hits[0].id, "idea-01");
  assert.equal(hits.filter((hit) => hit.id === "idea-01").length, 1);
  const english = await repo.similarIdeas("Disposable kidney dishes", "Replace single-use bowls", "en");
  assert.equal(english.length, 0);
  const direct = findSimilar("Kantine Speiseplan vegetarisch", "Menü am Freitag", DEMO_IDEAS);
  assert.equal(direct.length, 0);
  await repo.addComment("idea-02", "Bitte den Flur zuerst zählen.", true);
  await assert.equal(await repo.addComment("idea-02", "Das ist doch idiotisch.").then(() => "ok", (error) => error.code), "insult");
  await assert.equal(await repo.createIdea({
    title: "Dr. Meier soll das abschaffen",
    description: "Dr. Meier macht das jeden Tag falsch und es kostet Material auf der Station.",
    category: "material",
    location: "mitte",
    effort: "gering",
    language: "de",
  }).then(() => "ok", (error) => error.code), "fields");
  assert.equal(namesPerson("Dr. X macht das"), true);
  assert.equal(findInsult("ein normaler Satz"), false);
});

test("Kommentarregeln, Meldung, Ausblenden und Vorprüfung", async () => {
  const repo = fresh();
  await repo.login({ username: "mitarbeiter", password: "Ideenbox-LA" });
  await assert.rejects(() => repo.addComment("idea-04", "Die Zählung über eine Woche wäre hilfreich."), (error) => error.code === "rules");
  const comment = await repo.addComment("idea-04", "Die Zählung über eine Woche wäre hilfreich.", true);
  assert.equal(comment.status, "visible");
  await repo.reportComment("idea-04", comment.id);
  await repo.logout();
  await repo.login({ username: "moderation", password: "Ideenbox-LA" });
  await repo.setCommentStatus("idea-04", comment.id, "hidden");
  await repo.logout();
  await repo.login({ username: "admin", password: "Ideenbox-LA" });
  await repo.setPremoderation(true);
  await repo.logout();
  await repo.login({ username: "mitarbeiter", password: "Ideenbox-LA" });
  const pending = await repo.addComment("idea-06", "Die Notfallregel sollte bleiben.");
  assert.equal(pending.pending, true);
  await repo.logout();
  await repo.login({ username: "moderation", password: "Ideenbox-LA" });
  const visibleToOther = await repo.getIdea("idea-06");
  assert.ok(visibleToOther.comments.some((item) => item.status === "pending"));
  await repo.logout();
  await repo.login({ username: "mitarbeiter", password: "Ideenbox-LA" });
  const own = await repo.getIdea("idea-06");
  assert.ok(own.comments.some((item) => item.status === "pending" && item.mine));
});

test("Moderation, Ablehnung mit Dank und k-Anonymität", async () => {
  const repo = fresh();
  await assert.rejects(() => repo.login({ username: "mitarbeiter", password: "falsch" }), (error) => error.code === "bad-login");
  await repo.login({ username: "moderation", password: "Ideenbox-LA" });
  await assert.rejects(() => repo.moderateIdea("idea-15", {
    status: "in_pruefung",
    category: "personal",
    feedback: "Wir prüfen das im Personalrat.",
    thanks: "Danke",
    reason: "",
  }), (error) => error.code === "wrong-area");
  await assert.rejects(() => repo.moderateIdea("idea-16", {
    status: "abgelehnt",
    category: "material",
    thanks: "Vielen Dank für Ihre Idee.",
    reason: "zu kurz",
    feedback: "",
  }), (error) => error.code === "fields");
  const saved = await repo.moderateIdea("idea-16", {
    status: "abgelehnt",
    category: "material",
    thanks: "Vielen Dank für Ihre Idee und die Zeit, die Sie sich dafür genommen haben.",
    reason: "Der Mindest-Hub ist durch die Hygiene bereits vorgegeben und darf nicht kleiner werden.",
    feedback: "",
  });
  assert.match(saved.feedback, /^Vielen Dank/);
  assert.equal(saved.feedbackBy, undefined);
  await repo.logout();
  await repo.login({ username: "admin", password: "Ideenbox-LA" });
  const stats = await repo.adminStats();
  assert.equal(stats.realizedSavings, 24700);
  assert.equal(stats.activeIdeas, 17);
  const profession = Object.fromEntries(stats.byProfession.map((row) => [row.id, row.display]));
  assert.equal(profession.pflege, "5");
  assert.equal(profession.arzt, "5");
  assert.equal(profession.verwaltung, "<5");
  assert.equal(profession.ausbildung, "<5");
  const hidden = stats.byProfession.find((row) => row.id === "ausbildung");
  assert.equal(JSON.stringify(hidden).includes('"count"'), false);
  assert.equal(stats.byHomeArea.find((row) => row.id === "pflege").display, "6");
  assert.equal(stats.byAge.find((row) => row.id === "a30").display, "6");
  assert.equal(stats.byGender.find((row) => row.id === "d").display, "<5");
  const secondary = anonymizeGroups([
    { id: "a", label: "A", count: 10 },
    { id: "b", label: "B", count: 6 },
    { id: "c", label: "C", count: 1 },
  ]);
  assert.equal(secondary.find((row) => row.id === "b").display, "<5");
  assert.equal(secondary.find((row) => row.id === "c").display, "<5");
});

test("Sortierung und Zurücksetzen", async () => {
  const repo = fresh();
  await repo.login({ username: "admin", password: "Ideenbox-LA" });
  const ideas = await repo.listIdeas();
  const { filterIdeas } = await import("../js/filter.js");
  assert.equal(filterIdeas(ideas, { sort: "new" })[0].id, "idea-11");
  assert.equal(filterIdeas(ideas, { sort: "support" })[0].id, "idea-04");
  assert.equal(filterIdeas(ideas, { sort: "savings" })[0].id, "idea-15");
  await repo.resetDemoData();
  assert.equal(await repo.currentUser(), null);
});

let failed = 0;
for (const item of tests) {
  try {
    await item.fn();
    console.log("ok", item.name);
  } catch (error) {
    failed += 1;
    console.error("FAIL", item.name);
    console.error(error);
  }
}
if (failed) process.exit(1);
