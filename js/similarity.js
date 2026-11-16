/**
 * Clientseitige Ähnlichkeitssuche.
 * Normalisierte Tokens, deutsche Stoppwörter, einfaches Stammformen-Abschneiden,
 * danach Cosinus auf TF-IDF und Jaccard. Bewusst nachvollziehbar und ohne Dienst.
 */

const STOP = new Set(
  `der die das den dem des ein eine einer einem einen und oder aber auch wie auf mit fuer von zu zum zur im in an am als ist sind war waren wird werden wurde wurden bei nach ueber unter aus durch um so da denn doch nur noch nicht kein keine keinen keiner seinem seinen seiner sein seine ihrem ihren ihrer ihre ihr es sie er wir uns man sich schon hier dort dann wenn weil obwohl damit ohne zwischen sowie bzw per pro je sehr viel viele mehr weniger alle allen alles etwas nichts etwa circa jahr jahre jaehrlich tag tage taeglich monat monate bitte gern gerne moeglich koennen kann soll sollte muss muessen haben hat hatte dass diese dieser dieses dies jene beim vom unseres unsere unserer bereits dabei dazu dafuer deshalb deswegen zudem zusaetzlich insbesondere beispielsweise zb ggf usw etc via immer wieder weiter geben gibt gehen geht lassen laesst machen macht neu neue neuen neuer neues eigene eigenen eigener andere anderen anderer anderes solche solcher solchen diesem diesen welche welcher welchen welchem deren dessen jemand niemand gut besser ganz eher oft haeufig selten heute morgen gestern daher darum mal sollte wuerde waere waeren sollen sollten koennte koennten ab seit bis vor beim zum zur fuer umso dabei dazu hierfuer hiermit station stationen klinik klinikum krankenhaus bereich bereiche standort standorte mitarbeit mitarbeitende mitarbeiter idee ideen vorschlag vorschlaege patient patienten patientinnen euro kosten kost sparen spar einsparung einspar landshut achdorf rottenburg kinderklinik verbund verbundweit mitte haus haeuser dortigen hiesigen einfach einfacheren bestehenden vorhanden vorhandenem waere dafuer dazu schon noch nur auch werden kann soll bitte gern`
    .trim()
    .split(/\s+/),
);

const SHORT = new Set(["op", "ct", "mrt", "zna", "led"]);

const SYNONYMS = new Map([
  ["strom", "energie"],
  ["beleuchtung", "licht"],
  ["led", "licht"],
  ["monitor", "bildschirm"],
  ["bildschirme", "bildschirm"],
  ["untersuchungshandschuh", "handschuh"],
  ["einmalhandschuh", "handschuh"],
  ["handschuh", "handschuh"],
  ["roentgen", "bildgebung"],
  ["computertomographie", "bildgebung"],
  ["ct", "bildgebung"],
  ["mrt", "bildgebung"],
  ["voruntersuchung", "befund"],
  ["voruntersuchungen", "befund"],
  ["papierkurve", "kurve"],
  ["visitenkurve", "kurve"],
  ["arztbrief", "entlassbrief"],
  ["zeitarbeit", "leiharbeit"],
  ["leihpersonal", "leiharbeit"],
  ["springer", "springerpool"],
  ["haendedesinfektion", "desinfektion"],
  ["desinfektionsmittel", "desinfektion"],
  ["patiententransport", "transport"],
  ["transporte", "transport"],
  ["zna", "notaufnahme"],
  ["triage", "notaufnahme"],
  ["kuehlschrank", "kuehlung"],
  ["kuehlschraenke", "kuehlung"],
  ["laborkuehlschrank", "kuehlung"],
  ["sprechstunde", "ambulanz"],
  ["aufnahmeformular", "formular"],
  ["aufnahmeformulare", "formular"],
]);

const SUFFIXES = ["ungen", "heit", "keit", "lich", "isch", "ungen", "ung", "ern", "end", "est", "en", "er", "em", "es", "el", "nd", "ig", "e", "n", "s"];

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function labelFor(original) {
  if (/[A-ZÄÖÜ]/.test(original.slice(1))) return original;
  if (original.toUpperCase() === original && original.length <= 5) return original.toUpperCase();
  return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
}

function stemToken(token) {
  if (SHORT.has(token) || token.length < 5) return token;
  for (const suffix of SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

function foldToken(raw) {
  const folded = normalizeText(raw).replace(/[^a-z0-9]/g, "");
  if (!folded) return null;
  if (folded.length < 3 && !SHORT.has(folded)) return null;
  if (STOP.has(folded)) return null;
  let token = SHORT.has(folded) ? folded : stemToken(folded);
  if (SYNONYMS.has(token)) token = SYNONYMS.get(token);
  if (STOP.has(token) || (token.length < 3 && !SHORT.has(token))) return null;
  return token;
}

export function analyzeText(value) {
  const tokens = [];
  const display = new Map();
  const pattern = /[A-Za-zÄÖÜäöüß0-9]+/g;
  const source = String(value ?? "");
  let match = pattern.exec(source);
  while (match) {
    const original = match[0];
    const token = foldToken(original);
    if (token) {
      tokens.push(token);
      if (!display.has(token)) display.set(token, labelFor(original));
    }
    match = pattern.exec(source);
  }
  return { tokens, display };
}

export function tokenize(value) {
  return analyzeText(value).tokens;
}

export function matchesQuery(idea, query) {
  const needle = normalizeText(query).trim();
  if (!needle) return true;
  const hay = normalizeText(
    [idea.title, idea.description, idea.categoryLabel, idea.locationLabel, idea.statusLabel, idea.authorPseudonym, idea.feedback]
      .filter(Boolean)
      .join(" "),
  );
  return needle.split(/\s+/).filter(Boolean).every((word) => hay.includes(word));
}

function termFrequency(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

function tfidf(tokens, documentFrequency, documents) {
  const counts = termFrequency(tokens);
  const vector = new Map();
  for (const [token, count] of counts) {
    const idf = Math.log((documents + 1) / ((documentFrequency.get(token) || 0) + 1)) + 1;
    vector.set(token, (1 + Math.log(count)) * idf);
  }
  return vector;
}

function cosine(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const value of left.values()) leftNorm += value * value;
  for (const value of right.values()) rightNorm += value * value;
  const [small, large] = left.size < right.size ? [left, right] : [right, left];
  for (const [token, value] of small) {
    if (large.has(token)) dot += value * large.get(token);
  }
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function sharedTokens(queryTokens, docTokens, documentFrequency, documents) {
  const docs = new Set(docTokens);
  const limit = Math.max(4, Math.round(documents * 0.45));
  const shared = [];
  for (const token of new Set(queryTokens)) {
    if (!docs.has(token)) continue;
    if ((documentFrequency.get(token) || 0) > limit) continue;
    shared.push(token);
  }
  return shared;
}

/**
 * @param {string} title
 * @param {string} description
 * @param {{id:string,title:string,description:string,mergedIntoId?:string|null}[]} ideas
 * @returns {{id:string,score:number,sharedLabels:string[]}[]}
 */
export function findSimilar(title, description, ideas) {
  const query = analyzeText(`${title || ""} ${title || ""} ${description || ""}`);
  if (query.tokens.length === 0) return [];
  const docs = (ideas || []).map((idea) => {
    const analyzed = analyzeText(`${idea.title} ${idea.title} ${idea.description || ""}`);
    return {
      id: idea.id,
      mergedIntoId: idea.mergedIntoId || null,
      tokens: analyzed.tokens,
      display: analyzed.display,
    };
  });
  const documentFrequency = new Map();
  for (const doc of docs) {
    for (const token of new Set(doc.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }
  const documents = Math.max(docs.length, 1);
  const queryVector = tfidf(query.tokens, documentFrequency, documents);
  const hits = [];
  for (const doc of docs) {
    if (!doc.tokens.length) continue;
    const scoreCosine = cosine(queryVector, tfidf(doc.tokens, documentFrequency, documents));
    const shared = sharedTokens(query.tokens, doc.tokens, documentFrequency, documents);
    const score = 0.75 * scoreCosine + 0.25 * jaccard(query.tokens, doc.tokens);
    const uniqueQuery = new Set(query.tokens);
    const rareSingle = uniqueQuery.size <= 2 && shared.length === 1 && (documentFrequency.get(shared[0]) || 0) <= 2 && scoreCosine >= 0.45;
    const strong = score >= 0.4 && shared.length >= 1;
    const normal = score >= 0.16 && shared.length >= 2;
    if (!(rareSingle || strong || normal)) continue;
    const sharedLabels = shared.slice(0, 4).map((token) => query.display.get(token) || doc.display.get(token) || token);
    hits.push({ id: doc.id, score, sharedLabels, mergedIntoId: doc.mergedIntoId });
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const seen = new Set();
  const collapsed = [];
  for (const hit of hits) {
    const target = hit.mergedIntoId || hit.id;
    if (seen.has(target)) continue;
    seen.add(target);
    collapsed.push({ id: target, score: hit.score, sharedLabels: hit.sharedLabels });
    if (collapsed.length >= 3) break;
  }
  return collapsed;
}
