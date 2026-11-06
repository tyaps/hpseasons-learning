import { ref } from 'vue';
import type { Topic } from '../types/content';

export const CREATURE_SELECTION_KEY = 'hps-excluded-creatures-v1';
export function parseExcludedCreatures(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string =>
      typeof id === 'string' && /^monster-(0[1-9]|[1-5][0-9]|6[0-7])$/.test(id)))].sort() : [];
  } catch { return []; }
}
function read(): string[] {
  try { return parseExcludedCreatures(localStorage.getItem(CREATURE_SELECTION_KEY)); } catch { return []; }
}
const excluded = ref<string[]>(read());
export function reloadCreatureSelection(): void { excluded.value = read(); }
export function filterCreatureTopics(topics: Topic[], ids: string[]): Topic[] {
  return topics.map(t => ({ ...t, questions: t.questions.filter(q => !ids.includes(q.rule?.split('#')[0] ?? '')) }));
}
export function useCreatureSelection() {
  function setEnabled(id: string, enabled: boolean): void {
    excluded.value = parseExcludedCreatures(JSON.stringify(enabled ? excluded.value.filter(x => x !== id) : [...excluded.value, id]));
    try { localStorage.setItem(CREATURE_SELECTION_KEY, JSON.stringify(excluded.value)); } catch { /* Сохраняем в памяти. */ }
  }
  return { excluded, setEnabled };
}
