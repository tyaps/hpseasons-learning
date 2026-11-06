import type { RouteLocationRaw } from 'vue-router';

/** Превращает `spells#casting` в маршрут `/rules/spells?anchor=casting`. */
export function ruleLocation(rule: string): RouteLocationRaw {
  const [id, anchor] = rule.split('#');
  return anchor
    ? { path: `/rules/${id}`, query: { anchor } }
    : { path: `/rules/${id}` };
}
