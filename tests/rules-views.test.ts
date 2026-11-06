import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { mockFetch, mountAt } from './helpers';

const topics = [
  { id: 'spells', title: 'Заклинания', description: 'Формулы', order: 1, questionCount: 5 },
  { id: 'creatures', title: 'Существа', description: 'Кто восприимчив', order: 2, questionCount: 4 },
];

const rules = [
  { id: 'spells', title: 'Заклинания', section: 'Магия', order: 1, anchors: [] },
  { id: 'consequences', title: 'Последствия', section: 'Магия', order: 2, anchors: [] },
  { id: 'creatures', title: 'Существа', section: 'Бестиарий', order: 1, anchors: [] },
];

const spellsRule = {
  id: 'spells',
  title: 'Заклинания',
  section: 'Магия',
  order: 1,
  anchors: [
    { id: 'casting', title: 'Условия' },
    { id: 'unforgivable', title: 'Непростительные' },
  ],
  html: '<p>Вступление</p><h2 id="casting">Условия</h2><p>Текст</p><h2 id="unforgivable">Непростительные</h2>',
};

const scrollSpy = vi.fn();

beforeEach(() => {
  clearContentCache();
  scrollSpy.mockClear();
  Element.prototype.scrollIntoView = scrollSpy;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomeView', () => {
  it('показывает карточки тем с числом вопросов', async () => {
    mockFetch({ 'data/topics.json': topics });
    const { wrapper } = await mountAt('/');
    const cards = wrapper.findAll('a.card:not(.card--all)');
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toContain('Заклинания');
    expect(cards[0].text()).toContain('Вопросов: 5');
  });
});

describe('RulesIndexView', () => {
  it('группирует статьи по разделам', async () => {
    mockFetch({ 'data/rules.json': rules });
    const { wrapper } = await mountAt('/rules');
    const sections = wrapper.findAll('.rule-section');
    expect(sections.map((s) => s.find('h2').text())).toEqual(['Магия', 'Бестиарий']);
    expect(sections[0].findAll('li').map((li) => li.text())).toEqual(['Заклинания', 'Последствия']);
  });
});

describe('RuleView', () => {
  it('выводит HTML статьи и оглавление с якорями', async () => {
    mockFetch({ 'data/rules/spells.json': spellsRule });
    const { wrapper } = await mountAt('/rules/spells');
    expect(wrapper.find('h1').text()).toBe('Заклинания');
    expect(wrapper.find('.rule__body h2#casting').exists()).toBe(true);
    expect(wrapper.findAll('.toc a')).toHaveLength(2);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('прокручивает к якорю из query', async () => {
    mockFetch({ 'data/rules/spells.json': spellsRule });
    await mountAt('/rules/spells?anchor=unforgivable');
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect((scrollSpy.mock.contexts[0] as HTMLElement).id).toBe('unforgivable');
  });

  it('прокручивает при переходе по оглавлению', async () => {
    mockFetch({ 'data/rules/spells.json': spellsRule });
    const { wrapper } = await mountAt('/rules/spells');
    await wrapper.findAll('.toc a')[1].trigger('click');
    await flushPromises();
    expect((scrollSpy.mock.contexts.at(-1) as HTMLElement).id).toBe('unforgivable');
  });
});

describe('Ошибки и «Не найдено»', () => {
  it('несуществующая статья (404) — страница «Не найдено»', async () => {
    mockFetch({ 'data/rules/nope.json': 404 });
    const { wrapper } = await mountAt('/rules/nope');
    expect(wrapper.text()).toContain('Не найдено');
  });

  it('вместо JSON пришёл HTML (хостинг без 404) — «Не найдено»', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    );
    const { wrapper } = await mountAt('/rules/nope');
    expect(wrapper.text()).toContain('Не найдено');
  });

  it('неизвестный маршрут — «Не найдено»', async () => {
    mockFetch({});
    const { wrapper } = await mountAt('/some/unknown/page');
    expect(wrapper.find('h1').text()).toBe('Не найдено');
  });

  it('ошибка загрузки: сообщение и кнопка «Повторить»', async () => {
    let fail = true;
    mockFetch({
      'data/topics.json': () => (fail ? new Error('network') : topics),
    });
    const { wrapper } = await mountAt('/');
    expect(wrapper.text()).toContain('Не удалось загрузить данные');
    const retry = wrapper.findAll('button').find((b) => b.text() === 'Повторить');
    expect(retry).toBeDefined();

    fail = false;
    await retry!.trigger('click');
    await flushPromises();
    expect(wrapper.findAll('a.card:not(.card--all)')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('Не удалось загрузить данные');
  });

  it('ответ 500 тоже считается ошибкой загрузки', async () => {
    mockFetch({ 'data/topics.json': 500 });
    const { wrapper } = await mountAt('/');
    expect(wrapper.text()).toContain('Повторить');
  });
});
