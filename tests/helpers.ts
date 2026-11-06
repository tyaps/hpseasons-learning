import { flushPromises, mount } from '@vue/test-utils';
import { vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import App from '../src/App.vue';
import { createAppRouter } from '../src/router';

type Body = unknown;
export type FetchRoutes = Record<string, Body | number | Error | (() => Body | number | Error)>;

/** Подменяет `fetch`: ключ — окончание URL, значение — JSON, HTTP-статус или ошибка. */
export function mockFetch(routes: FetchRoutes) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.endsWith(k));
    if (!key) return new Response('not found', { status: 404 });
    const raw = routes[key];
    const value = typeof raw === 'function' ? (raw as () => Body | number | Error)() : raw;
    if (value instanceof Error) throw value;
    if (typeof value === 'number') return new Response('', { status: value });
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export async function mountAt(path: string) {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}
