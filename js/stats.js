import { AGE_GROUPS, CATEGORIES, GENDERS, HOME_AREAS, K_ANONYMITY, LOCATIONS, PROFESSIONS, STATUSES, TENURES } from "./config.js";

export function midpoint(min, max) {
  if (min == null && max == null) return null;
  if (min == null) return max;
  if (max == null) return min;
  return (min + max) / 2;
}

/**
 * Gruppen unter der Schwelle werden als "<5" ausgegeben.
 * Liegt nur eine Gruppe darunter, wird zusätzlich die kleinste andere Gruppe
 * ausgeblendet, damit der Wert nicht durch Differenzbildung errechenbar ist.
 * Die Rohzahl verlässt diese Funktion bei ausgeblendeten Gruppen nicht.
 */
export function anonymizeGroups(rows, threshold = K_ANONYMITY) {
  const present = rows.filter((row) => row.count > 0).map((row) => ({ id: row.id, label: row.label, count: row.count }));
  const hidden = new Set(present.filter((row) => row.count < threshold).map((row) => row.id));
  if (hidden.size === 1) {
    const visible = present.filter((row) => !hidden.has(row.id));
    if (visible.length > 0) {
      const extra = visible.reduce((smallest, row) => (row.count < smallest.count ? row : smallest));
      hidden.add(extra.id);
    }
  }
  const visibleCounts = present.filter((row) => !hidden.has(row.id)).map((row) => row.count);
  const max = Math.max(...visibleCounts, 1);
  return present.map((row) => {
    const suppressed = hidden.has(row.id);
    return {
      id: row.id,
      label: row.label,
      display: suppressed ? "<5" : String(row.count),
      suppressed,
      bar: suppressed ? null : Math.round((row.count / max) * 100),
    };
  });
}

function countBy(ideas, key, list) {
  const counts = new Map(list.map((item) => [item.id, 0]));
  for (const idea of ideas) {
    const id = idea[key];
    if (counts.has(id)) counts.set(id, counts.get(id) + 1);
  }
  return list.map((item) => ({ id: item.id, label: item.label, count: counts.get(item.id) || 0 }));
}

function bars(rows) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    count: row.count,
    bar: Math.round((row.count / max) * 100),
    color: row.color || "#1e4d78",
  }));
}

function demographic(ideas, key, list) {
  return anonymizeGroups(countBy(ideas, key, list));
}

export function buildStats(ideas, demographics) {
  const all = ideas || [];
  const active = all.filter((idea) => idea.status !== "zusammengefuehrt");
  const withDemo = active.map((idea) => ({
    ...idea,
    ...(demographics?.[idea.id] || { profession: "keine", gender: "keine", ageGroup: "keine", tenure: "keine", homeArea: "keine" }),
  }));

  let estimatedSavings = 0;
  let estimatedCount = 0;
  let pipelineSavings = 0;
  let realizedSavings = 0;
  let realizedCount = 0;
  let missingRealized = 0;
  let supportTotal = 0;

  for (const idea of active) {
    supportTotal += (idea.supports || []).length;
    const mid = midpoint(idea.savingsMin, idea.savingsMax);
    if (mid != null) {
      estimatedSavings += mid;
      estimatedCount += 1;
      if (idea.status === "angenommen" || idea.status === "umgesetzt") pipelineSavings += mid;
    }
    if (idea.status === "umgesetzt") {
      if (idea.realizedSavings == null) missingRealized += 1;
      else {
        realizedSavings += idea.realizedSavings;
        realizedCount += 1;
      }
    }
  }

  const categoryCounts = countBy(active, "category", CATEGORIES);
  const emptyCategories = categoryCounts.filter((row) => row.count === 0).map((row) => row.label);

  return {
    threshold: K_ANONYMITY,
    activeIdeas: active.length,
    mergedIdeas: all.length - active.length,
    supportTotal,
    estimatedSavings,
    estimatedCount,
    pipelineSavings,
    realizedSavings,
    realizedCount,
    missingRealized,
    byCategory: bars(categoryCounts.filter((row) => row.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"))),
    byLocation: bars(countBy(active, "location", LOCATIONS)),
    byStatus: bars(countBy(all, "status", STATUSES)),
    emptyCategories,
    byProfession: demographic(withDemo, "profession", PROFESSIONS),
    byGender: demographic(withDemo, "gender", GENDERS),
    byAge: demographic(withDemo, "ageGroup", AGE_GROUPS),
    byTenure: demographic(withDemo, "tenure", TENURES),
    byHomeArea: demographic(withDemo, "homeArea", HOME_AREAS),
  };
}
