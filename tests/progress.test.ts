import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { parseProgress, PROGRESS_KEY, reloadProgress, useProgress } from '../src/composables/useProgress';
import { reloadSettings, useSettings } from '../src/composables/useSettings';
import { mockFetch, mountAt } from './helpers';

beforeEach(() => {
  localStorage.clear();
  reloadProgress();
});

describe('useProgress', () => {
  it('record сохраняет best как максимум и last как последний результат', () => {
    const progress = useProgress();
    progress.record('t', 3, 5);
    progress.record('t', 5, 5);
    progress.record('t', 2, 5);
    const p = progress.get('t')!;
    expect(p).toMatchObject({ best: 5, last: 2, total: 5 });
    expect(typeof p.updatedAt).toBe('string');
  });

  it('данные читаются после «перезагрузки»', () => {
    useProgress().record('t', 4, 5);
    reloadProgress();
    expect(useProgress().get('t')).toMatchObject({ best: 4, last: 4, total: 5 });
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).version).toBe(1);
  });

  it('если число вопросов изменилось, рекорд пересчитывается заново', () => {
    const progress = useProgress();
    progress.record('t', 5, 5);
    progress.record('t', 2, 8);
    expect(progress.get('t')).toMatchObject({ best: 2, total: 8 });
  });

  it('reset очищает прогресс и хранилище', () => {
    const progress = useProgress();
    progress.record('t', 1, 2);
    progress.reset();
    expect(progress.get('t')).toBeUndefined();
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('get для неизвестной темы возвращает undefined', () => {
    expect(useProgress().get('nope')).toBeUndefined();
  });

  it('повреждённый JSON сбрасывается без падения', () => {
    localStorage.setItem(PROGRESS_KEY, '{broken');
    reloadProgress();
    expect(useProgress().get('t')).toBeUndefined();
    useProgress().record('t', 1, 2);
    expect(useProgress().get('t')).toMatchObject({ best: 1 });
  });

  it('данные неверной версии или формы отбрасываются', () => {
    expect(parseProgress('{"version":2,"topics":{}}').topics).toEqual({});
    expect(parseProgress('null').topics).toEqual({});
    expect(parseProgress('[]').topics).toEqual({});
    const mixed = JSON.stringify({
      version: 1,
      topics: {
        ok: { best: 1, last: 1, total: 2, updatedAt: 'x' },
        badType: { best: 'a', last: 1, total: 2, updatedAt: 'x' },
        tooBig: { best: 9, last: 1, total: 2, updatedAt: 'x' },
      },
    });
    expect(Object.keys(parseProgress(mixed).topics)).toEqual(['ok']);
  });
});

describe('Прогресс в интерфейсе', () => {
  const topics = [
    { id: 't', title: 'Тема', description: 'd', order: 1, questionCount: 1 },
  ];
  const topic = {
    ...topics[0],
    questions: [
      {
        id: 'q1',
        type: 'single',
        prompt: 'Вопрос?',
        options: [
          { id: 'a', text: 'Верный', correct: true },
          { id: 'b', text: 'Неверный' },
        ],
        explanation: 'e',
      },
    ],
  };

  beforeEach(() => {
    clearContentCache();
    reloadSettings();
    useSettings().setShuffle(false);
    mockFetch({ 'data/topics.json': topics, 'data/topics/t.json': topic });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('результат сохраняется в конце теста и виден на главной', async () => {
    const { wrapper, router } = await mountAt('/');
    expect(wrapper.find('[data-test="best"]').text()).toBe('Ещё не проходили');

    await router.push('/topic/t');
    await flushPromises();
    await wrapper.find('[data-test="start"]').trigger('click');
    await wrapper.find('[data-option-id="a"]').trigger('click');
    await flushPromises();
    expect(useProgress().get('t')).toBeUndefined();
    await wrapper.find('[data-test="next"]').trigger('click');
    await flushPromises();
    expect(useProgress().get('t')).toMatchObject({ best: 1, last: 1, total: 1 });

    await router.push('/');
    await flushPromises();
    expect(wrapper.find('[data-test="best"]').text()).toBe('Лучший результат: 1 из 1');
  });

  it('кнопка сброса очищает прогресс после подтверждения', async () => {
    useProgress().record('t', 1, 1);
    const { wrapper } = await mountAt('/');
    expect(wrapper.find('[data-test="best"]').text()).toContain('1 из 1');

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await wrapper.find('[data-test="reset"]').trigger('click');
    expect(wrapper.find('[data-test="best"]').text()).toContain('1 из 1');

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await wrapper.find('[data-test="reset"]').trigger('click');
    expect(wrapper.find('[data-test="best"]').text()).toBe('Ещё не проходили');
  });
});
