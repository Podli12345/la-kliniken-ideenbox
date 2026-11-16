/** Hinweise gegen persönliche Angriffe. Kein externer Dienst. */

const INSULTS = [
  "idiot", "dummkopf", "arschloch", "schwachsinn", "trottel", "vollidiot", "depp",
  "scheisse", "scheiße", "hurensohn", "missgeburt", "spasti", "wichser", "fotze",
  "moron", "retard", "stupid asshole",
];

function fold(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export function findInsult(text) {
  const folded = fold(text);
  return INSULTS.some((word) => folded.includes(fold(word)));
}

export function namesPerson(text) {
  const source = String(text ?? "");
  const titled = /(?:^|[^\p{L}])(?:dr|prof|herrn?|frau|schwester|pfleger(?:in)?|kollege(?:n|in)?|chefarzt|chefärztin|oberarzt|oberärztin)\.?\s+([A-ZÄÖÜ][\p{L}.'-]*)/giu;
  for (const match of source.matchAll(titled)) {
    if (/^[A-ZÄÖÜ]/.test(match[1])) return true;
  }
  return /(?:^|[^\p{L}])(?:dr|prof)\.?\s+x\b/iu.test(source);
}

export function inspectConduct(text) {
  return {
    person: namesPerson(text),
    insult: findInsult(text),
  };
}
