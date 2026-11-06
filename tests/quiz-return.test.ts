import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { reloadSettings, useSettings } from '../src/composables/useSettings';
import { mockFetch, mountAt } from './helpers';

const questions = [1, 2, 3].map((n) => ({
  id: `q${n}`, type: 'single', prompt: `Вопрос ${n}`,
  options: [{ id: 'a', text: 'Верно', correct: true }, { id: 'b', text: 'Ошибка' }],
  explanation: `Разбор ${n}`, rule: n === 2 ? 'monster-01#vulnerabilities' : 'spells#casting',
}));
const topic = { id: 't', title: 'Тема', description: 'd', order: 1, questionCount: 3, questions };
const article = (id: string, section: string, anchor: string) => ({
  id, title: id, section, order: 1, anchors: [{ id: anchor, title: 'Раздел' }],
  html: `<h2 id="${anchor}">Раздел</h2><p>Текст</p>`,
});

beforeEach(() => {
  clearContentCache();
  localStorage.clear();
  reloadSettings();

  useSettings().setShuffle(true);
  Element.prototype.scrollIntoView = vi.fn();
  mockFetch({
    'data/topics/t.json': topic,
    'data/topics.json': [{ ...topic, questions: undefined }],
    'data/rules.json': [],
    'data/rules/spells.json': article('spells', 'Магия', 'casting'),
    'data/rules/monster-01.json': article('monster-01', 'Монстробук', 'vulnerabilities'),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Возврат к вопросу из справочника', () => {
  it('возвращает тот же вопрос, ошибочный ответ, порядок вариантов и счёт', async () => {
    const { wrapper, router } = await mountAt('/topic/t');
    const click = async (selector: string) => {
      await wrapper.find(selector).trigger('click');
      await flushPromises();
    };
    await click('[data-test="start"]');
    await click('[data-option-id="a"]');
    await click('[data-test="next"]');
    await click('[data-option-id="b"]');
    const order = wrapper.findAll('.option-btn').map((b) => b.attributes('data-option-id'));
    await click('.feedback__links a');
    expect(router.currentRoute.value.path).toBe('/monsters/monster-01');
    expect(wrapper.find('[data-test="quiz-return"]').text()).toBe('← Назад в тест');
    await click('.toc a');
    expect(wrapper.find('[data-test="quiz-return"]').exists()).toBe(true);
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
    await click('[data-test="quiz-return"]');
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 2 из 3');
    expect(wrapper.find('[data-test="explanation"]').text()).toBe('Разбор 2');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Неверно');
    expect(wrapper.findAll('.option-btn').map((b) => b.attributes('data-option-id'))).toEqual(order);
    expect(wrapper.findAll('.option-btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.find('[data-test="quiz-return"]').exists()).toBe(false);
    await click('[data-test="next"]');
    await click('[data-option-id="a"]');
    await click('[data-test="next"]');
    expect(wrapper.find('[data-test="score"]').text()).toBe('2 из 3');
  });

  it('сохраняет состав и порядок случайного теста по всем темам', async () => {
    useSettings().setQuizLength('random');
    const { wrapper } = await mountAt('/all');
    await wrapper.find('[data-test="start"]').trigger('click');
    const prompt = wrapper.find('.question__prompt').text();
    await wrapper.find('[data-option-id="a"]').trigger('click');
    await wrapper.find('.feedback__links a').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="quiz-return"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('.question__prompt').text()).toBe(prompt);
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 3');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Верно!');
    expect(wrapper.find('[data-test="topic-label"]').text()).toBe('Тема: Тема');
  });

  it('работает в режиме обучения', async () => {
    const { wrapper } = await mountAt('/topic/t');
    await wrapper.find('[data-test="study-toggle"]').setValue(true);
    await wrapper.find('[data-test="start"]').trigger('click');
    await wrapper.find('.feedback__links a').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="quiz-return"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="study-badge"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="explanation"]').text()).toBe('Разбор 1');
    expect(wrapper.find('.feedback__verdict').exists()).toBe(false);
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
  });

  it('не появляется при прямом посещении статьи или при переходе через основную навигацию', async () => {
    const { wrapper, router } = await mountAt('/rules/spells?anchor=casting');
    expect(wrapper.find('[data-test="quiz-return"]').exists()).toBe(false);
    await router.push('/topic/t');
    await flushPromises();
    await wrapper.find('[data-test="start"]').trigger('click');
    await wrapper.find('[data-option-id="a"]').trigger('click');
    await wrapper.find('.feedback__links a').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="quiz-return"]').exists()).toBe(true);
    await wrapper.find('.site-nav a[href="/monsters"]').trigger('click');
    await flushPromises();
    await router.push('/monsters/monster-01');
    await flushPromises();
    expect(wrapper.find('[data-test="quiz-return"]').exists()).toBe(false);
  });
});
