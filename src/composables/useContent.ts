import { ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { Topic, TopicSummary } from '../types/content';

export class NotFoundError extends Error {
  constructor(url: string) {
    super(`Не найдено: ${url}`);
    this.name = 'NotFoundError';
  }
}

const cache = new Map<string, unknown>();

export function clearContentCache(): void {
  cache.clear();
}

export function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}data/${path}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const url = dataUrl(path);
  const response = await fetch(url);
  if (response.status === 404) throw new NotFoundError(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  // Dev-сервер и некоторые хостинги отдают index.html вместо 404.
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType.includes('text/html')) throw new NotFoundError(url);
  const value = (await response.json()) as T;
  cache.set(path, value);
  return value;
}

export type LoadError = 'notfound' | 'error';

export function useJson<T>(path: MaybeRefOrGetter<string>) {
  return useLoader<T>(path, fetchJson);
}

/** Все темы целиком (для теста «по всем темам»). */
export async function fetchAllTopics(): Promise<Topic[]> {
  const summaries = await fetchJson<TopicSummary[]>('topics.json');
  return Promise.all(summaries.map((s) => fetchJson<Topic>(`topics/${s.id}.json`)));
}

/** Темы для теста: одна тема (`id`) или все (`null`). */
export function useQuizTopics(topicId: MaybeRefOrGetter<string | null>) {
  return useLoader<Topic[]>(
    () => {
      const id = toValue(topicId);
      return id === null ? 'all-topics' : `topics/${id}.json`;
    },
    async (path) => (path === 'all-topics' ? fetchAllTopics() : [await fetchJson<Topic>(path)]),
  );
}

function useLoader<T>(path: MaybeRefOrGetter<string>, loader: (path: string) => Promise<T>) {
  const data = shallowRef<T>();
  const error = ref<LoadError | null>(null);
  const loading = ref(true);
  let token = 0;

  async function load(): Promise<void> {
    const current = ++token;
    loading.value = true;
    error.value = null;
    data.value = undefined;
    try {
      const value = await loader(toValue(path));
      if (current === token) data.value = value;
    } catch (e) {
      if (current === token) error.value = e instanceof NotFoundError ? 'notfound' : 'error';
    } finally {
      if (current === token) loading.value = false;
    }
  }

  watch(() => toValue(path), load, { immediate: true });

  return { data, error, loading, retry: load };
}
