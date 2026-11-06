import type { RouteLocationRaw } from 'vue-router';

/** Превращает `spells#casting` в маршрут `/rules/spells?anchor=casting`. */
export function ruleLocation(rule: string): RouteLocationRaw {
  const [id, anchor] = rule.split('#');
  const path = id.startsWith('monster-') ? `/monsters/${id}` : `/rules/${id}`;
  return anchor
    ? { path, query: { anchor } }
    : { path };
}
