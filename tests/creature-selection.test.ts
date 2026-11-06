import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { CREATURE_SELECTION_KEY, parseExcludedCreatures, filterCreatureTopics, reloadCreatureSelection, useCreatureSelection } from '../src/composables/useCreatureSelection';
import { reloadSettings, useSettings } from '../src/composables/useSettings';
import type { Topic } from '../src/types/content';
import { mockFetch, mountAt } from './helpers';

const topic: Topic = { id: 'creatures', title: 'Существа', description: '', order: 1, questionCount: 3, creatureQuestionCounts: { 'monster-01': 1, 'monster-09': 1 },
  questions: ['monster-01', 'monster-09', 'spells'].map((rule, i) => ({
    id: `q${i}`, prompt: `Вопрос ${rule}`, rule: `${rule}#profile`, type: 'single', explanation: 'Разбор',
    options: [{ id: 'a', text: 'Да', correct: true }, { id: 'b', text: 'Нет' }],
  })) };
const rules = ['monster-01', 'monster-09'].map(id => ({ id, title: id, section: 'Монстробук', order: 1, anchors: [] }));
beforeEach(() => {
  localStorage.clear(); reloadCreatureSelection(); reloadSettings(); useSettings().setShuffle(false); clearContentCache();
  mockFetch({ 'data/topics.json': [topic], 'data/topics/creatures.json': topic, 'data/rules.json': rules });
});
afterEach(() => { localStorage.clear(); reloadCreatureSelection(); vi.unstubAllGlobals(); });

describe('Выбор существ', () => {
  it('проверяет сохранённые значения и оставляет общие вопросы', () => {
    expect(parseExcludedCreatures('сломано')).toEqual([]);
    expect(parseExcludedCreatures('{}')).toEqual([]);
    expect(parseExcludedCreatures('["monster-09","monster-09","monster-68",null]')).toEqual(['monster-09']);
    expect(filterCreatureTopics([topic], ['monster-09'])[0].questions.map(q => q.id)).toEqual(['q0', 'q2']);
    expect(topic.questions).toHaveLength(3);
  });
  it('по умолчанию включает всех, сохраняет выбор и даёт ссылки на карточки', async () => {
    const { wrapper } = await mountAt('/creature-settings');
    const checks = wrapper.findAll('.creature-selection input');
    expect(checks).toHaveLength(2);
    expect(checks.every(c => (c.element as HTMLInputElement).checked)).toBe(true);
    await checks[1].setValue(false);
    expect(JSON.parse(localStorage.getItem(CREATURE_SELECTION_KEY)!)).toEqual(['monster-09']);
    reloadCreatureSelection();
    expect(useCreatureSelection().excluded.value).toEqual(['monster-09']);
    expect(wrapper.find('.creature-selection a').attributes('href')).toBe('/monsters/monster-01');
    wrapper.unmount();
  });
  it.each(['all', 'shuffled', 'random'] as const)('применяет фильтр в режиме %s и сохраняет текущую попытку', async length => {
    useCreatureSelection().setEnabled('monster-09', false);
    useSettings().setQuizLength(length);
    const { wrapper } = await mountAt('/all');
    expect(wrapper.text()).toContain('Всего вопросов: 2');
    await wrapper.find('[data-test="start"]').trigger('click');
    await flushPromises();
    useCreatureSelection().setEnabled('monster-01', false);
    await flushPromises();
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 2');
    expect(wrapper.find('[data-test="start-screen"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('не запускает пустую тему и обновляет диапазон после выбора', async () => {
    mockFetch({ 'data/topics/creatures.json': { ...topic, questions: topic.questions.slice(0, 2) } });
    useCreatureSelection().setEnabled('monster-01', false); useCreatureSelection().setEnabled('monster-09', false);
    const { wrapper } = await mountAt('/topic/creatures');
    expect(wrapper.find('[data-test="start"]').attributes('disabled')).toBeDefined();
    useCreatureSelection().setEnabled('monster-09', true); await flushPromises();
    expect((wrapper.find('[data-test="range-to"]').element as HTMLInputElement).value).toBe('1');
    expect(wrapper.find('[data-test="start"]').attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });
  it('возвращает из карточки к настройкам с сохранёнными флажками', async () => {
    mockFetch({
      'data/rules.json': rules,
      'data/rules/monster-01.json': { ...rules[0], html: '<h2 id="profile">Описание</h2>', anchors: [{ id: 'profile', title: 'Описание' }] },
    });
    Element.prototype.scrollIntoView = vi.fn();
    const { wrapper, router } = await mountAt('/creature-settings');
    await wrapper.find('.creature-selection input').setValue(false);
    await wrapper.find('.creature-selection a').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="settings-return"]').text()).toBe('← Назад в настройки');
    expect(wrapper.find('[data-test="settings-return"]').classes()).toContain('quiz-return');
    await wrapper.find('.toc a').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="settings-return"]').exists()).toBe(true);
    await wrapper.find('[data-test="settings-return"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/creature-settings');
    expect((wrapper.find('.creature-selection input').element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.find('[data-test="settings-return"]').exists()).toBe(false);
    await wrapper.find('.creature-selection a').trigger('click');
    await flushPromises();
    await wrapper.find('.site-nav a[href="/monsters"]').trigger('click');
    await flushPromises();
    await router.push('/monsters/monster-01');
    await flushPromises();
    expect(wrapper.find('[data-test="settings-return"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('главная показывает число доступных вопросов', async () => {
    useCreatureSelection().setEnabled('monster-09', false);
    const { wrapper } = await mountAt('/');
    expect(wrapper.find('[data-test="all-card"]').text()).toContain('Вопросов: 2');
    wrapper.unmount();
  });
});
