import { ref } from 'vue';

export const PROGRESS_KEY = 'hps-progress-v1';
const VERSION = 1;

export type TopicProgress = { best: number; last: number; total: number; updatedAt: string };
type ProgressState = { version: number; topics: Record<string, TopicProgress> };

function empty(): ProgressState {
  return { version: VERSION, topics: {} };
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function isTopicProgress(v: unknown): v is TopicProgress {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    isNonNegativeInt(p.best) &&
    isNonNegativeInt(p.last) &&
    isNonNegativeInt(p.total) &&
    typeof p.updatedAt === 'string' &&
    p.best <= p.total &&
    p.last <= p.total
  );
}

/** Разбирает сохранённые данные; при любой проблеме возвращает пустой прогресс. */
export function parseProgress(raw: string | null): ProgressState {
  if (!raw) return empty();
  try {
    const data = JSON.parse(raw) as { version?: unknown; topics?: unknown } | null;
    if (!data || data.version !== VERSION || !data.topics || typeof data.topics !== 'object') {
      return empty();
    }
    const topics: Record<string, TopicProgress> = {};
    for (const [id, value] of Object.entries(data.topics as Record<string, unknown>)) {
      if (isTopicProgress(value)) topics[id] = value;
    }
    return { version: VERSION, topics };
  } catch {
    return empty();
  }
}

function read(): ProgressState {
  try {
    return parseProgress(localStorage.getItem(PROGRESS_KEY));
  } catch {
    return empty();
  }
}

function write(state: ProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // хранилище недоступно — прогресс живёт до перезагрузки страницы
  }
}

const state = ref<ProgressState>(read());

/** Перечитывает прогресс из `localStorage` (после перезагрузки страницы, в тестах). */
export function reloadProgress(): void {
  state.value = read();
}

export function useProgress() {
  function get(topicId: string): TopicProgress | undefined {
    return state.value.topics[topicId];
  }

  function record(topicId: string, score: number, total: number): void {
    const prev = state.value.topics[topicId];
    // Если число вопросов в теме изменилось, прежний рекорд несопоставим с новым.
    const best = prev && prev.total === total ? Math.max(prev.best, score) : score;
    state.value = {
      version: VERSION,
      topics: {
        ...state.value.topics,
        [topicId]: { best, last: score, total, updatedAt: new Date().toISOString() },
      },
    };
    write(state.value);
  }

  function reset(): void {
    state.value = empty();
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // игнорируем: нечего очищать
    }
  }

  return { get, record, reset };
}
