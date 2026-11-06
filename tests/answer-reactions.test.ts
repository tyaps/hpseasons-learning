import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { reloadSettings, useSettings } from '../src/composables/useSettings';
import { mockFetch, mountAt } from './helpers';

const messages = { success: ['Молодец!', 'Так держать!'], failure: ['Облом!', 'Ну ты и лопух!'] };
const topic = { id: 't', title: 'Тема', description: '', order: 1, questionCount: 2,
  questions: [1, 2].map(n => ({ id: `q${n}`, type: 'single', prompt: `Вопрос ${n}`,
    options: [{ id: 'a', text: 'Да', correct: true }, { id: 'b', text: 'Нет' }],
    explanation: 'Разбор', rule: 'spells#casting' })) };
beforeEach(() => {
  clearContentCache(); localStorage.clear(); reloadSettings(); useSettings().setShuffle(false);
  mockFetch({ 'data/topics/t.json': topic, 'data/rules.json': [], 'data/reactions.json': messages,
    'data/rules/spells.json': { id: 'spells', title: 'Статья', section: 'Магия', order: 1, anchors: [], html: '<p>Правило</p>' } });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function start() {
  const mounted = await mountAt('/topic/t');
  await mounted.wrapper.find('[data-test="start"]').trigger('click');
  return mounted;
}

describe('Реплика персонажа после ответа', () => {
  it.each([['a', 'Молодец!'], ['b', 'Облом!']])('выбирает реплику для ответа %s и скрывает ровно через 3 секунды', async (id, text) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { wrapper: quiz } = await start();
    vi.useFakeTimers();
    await quiz.find(`[data-option-id="${id}"]`).trigger('click');
    expect(quiz.find('[data-test="answer-reaction"]').text()).toBe(text);
    expect(quiz.find('[data-test="answer-reaction"] img').attributes('src')).toBe('/data/assets/characters/red_hat.jpg');
    await vi.advanceTimersByTimeAsync(2999);
    expect(quiz.find('[data-test="answer-reaction"]').exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(quiz.find('[data-test="answer-reaction"]').exists()).toBe(false);
    quiz.unmount();
  });
  it.each([0.33, 0.9])('не показывает реплику при случайном числе %s', async chance => {
    vi.spyOn(Math, 'random').mockReturnValue(chance);
    const { wrapper } = await start();
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('показывает при числе ниже 0.33, выбирает реплику и не повторяет при просмотре прошлого ответа', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.329).mockReturnValueOnce(0.329).mockReturnValueOnce(0.75);
    const { wrapper } = await start();
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('[data-test="answer-reaction"]').text()).toBe('Так держать!');
    await wrapper.find('[data-test="next"]').trigger('click');
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(false);
    await wrapper.find('[data-test="previous"]').trigger('click');
    expect(wrapper.find('.feedback').exists()).toBe(true);
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('сбрасывает реплику при уходе в справочник и не повторяет при возврате', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { wrapper } = await start();
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(true);
    await wrapper.find('.feedback__links a').trigger('click'); await flushPromises();
    await wrapper.find('[data-test="quiz-return"]').trigger('click'); await flushPromises();
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it.each([[0, 'first.jpg'], [0.99, 'last.jpg']] as const)('случайно выбирает фото при значении %s', async (value, file) => {
    mockFetch({ 'data/topics/t.json': topic, 'data/rules.json': [], 'data/reactions.json': {
      ...messages, portraits: ['assets/characters/first.jpg', 'assets/characters/last.jpg'],
    } });
    vi.spyOn(Math, 'random').mockReturnValue(value).mockReturnValueOnce(0);
    const { wrapper } = await mountAt('/topic/t');

    await wrapper.find('[data-test="start"]').trigger('click');
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('[data-test="answer-reaction"] img').attributes('src')).toBe(`/data/assets/characters/${file}`);
    wrapper.unmount();
  });
  it('не показывает выбор оформления или проверочный флажок до и после старта', async () => {
    const { wrapper } = await mountAt('/topic/t');
    expect(wrapper.find('.theme-selector').exists()).toBe(false);
    expect(wrapper.find('[data-test="force-reactions"]').exists()).toBe(false);
    await wrapper.find('[data-test="start"]').trigger('click');
    expect(wrapper.find('[data-test="force-reactions"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('не срабатывает в режиме обучения', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { wrapper } = await mountAt('/topic/t');
    await wrapper.find('[data-test="study-toggle"]').setValue(true);

    await wrapper.find('[data-test="start"]').trigger('click');
    expect(wrapper.find('.feedback').exists()).toBe(true);
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it.each([[], undefined])('продолжает тест при пустом наборе или недоступных репликах (%j)', async options => {
    mockFetch({ 'data/topics/t.json': topic, 'data/rules.json': [],
      'data/reactions.json': options ? { success: options, failure: options } : 404 });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { wrapper } = await start();
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Верно!');
    expect(wrapper.find('[data-test="answer-reaction"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
