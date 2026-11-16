import { matchesQuery } from "./similarity.js";

function savingsMid(idea) {
  const min = idea.savingsMin;
  const max = idea.savingsMax;
  if (min == null && max == null) return -1;
  if (min == null) return max;
  if (max == null) return min;
  return (min + max) / 2;
}

function urgency(idea) {
  if (idea.due?.state === "open") return idea.due.days;
  if (idea.due?.state === "answered") return 10000;
  return 20000;
}

export function filterIdeas(ideas, filters = {}) {
  const rows = ideas.filter((idea) => {
    if (filters.category && idea.category !== filters.category) return false;
    if (filters.location && idea.location !== filters.location) return false;
    if (filters.status && idea.status !== filters.status) return false;
    if (filters.language && idea.language !== filters.language) return false;
    return matchesQuery(idea, filters.q || "");
  });
  const sort = filters.sort || "new";
  return rows.slice().sort((a, b) => {
    if (sort === "support") {
      return b.supportCount - a.supportCount || b.createdAt.localeCompare(a.createdAt);
    }
    if (sort === "savings") {
      return savingsMid(b) - savingsMid(a) || b.createdAt.localeCompare(a.createdAt);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortForModeration(ideas) {
  return ideas.slice().sort((a, b) => urgency(a) - urgency(b) || a.createdAt.localeCompare(b.createdAt));
}
