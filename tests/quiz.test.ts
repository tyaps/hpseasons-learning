import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { reloadSettings, useSettings } from '../src/composables/useSettings';
import { mockFetch, mountAt } from './helpers';

const topic = {
  id: 't',
  title: 'Тестовая тема',
  description: 'd',
  order: 1,
  questionCount: 3,
  questions: [
    {
      id: 'q1',
      type: 'single',
      prompt: 'Первый вопрос?',
      options: [
        { id: 'a', text: 'Верный', correct: true },
        { id: 'b', text: 'Неверный' },
        { id: 'c', text: 'Тоже неверный' },
      ],
      explanation: 'Потому что так.',
      rule: 'spells#casting',
      source: 'https://example.com/source',
    },
    {
      id: 'q2',
      type: 'multiple',
      prompt: 'Второй вопрос?',
      options: [
        { id: 'a', text: 'Раз', correct: true },
        { id: 'b', text: 'Два' },
        { id: 'c', text: 'Три', correct: true },
      ],
      explanation: 'Нужны Раз и Три.',
    },
    {
      id: 'q3',
      type: 'single',
      prompt: 'Третий вопрос?',
      options: [
        { id: 'a', text: 'Неверный' },
        { id: 'b', text: 'Верный', correct: true },
      ],
      explanation: 'Формула.',
    },
  ],
};

beforeEach(() => {
  clearContentCache();
  localStorage.clear();
  reloadSettings();
  useSettings().setShuffle(false);
  mockFetch({ 'data/topics/t.json': topic });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QuizView: полное прохождение', () => {
  it('назад показывает неизменяемые ответы и сохраняет незавершённый выбор', async () => {
    const { wrapper } = await mountAt('/topic/t');
    const click = async (selector: string) => {
      await wrapper.find(selector).trigger('click');
      await flushPromises();
    };
    await click('[data-test="start"]');
    expect(wrapper.find('[data-test="previous"]').exists()).toBe(false);
    await click('[data-option-id="b"]');
    await click('[data-test="next"]');
    await click('[data-option-id="a"]');
    await click('[data-test="previous"]');
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 3');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Неверно');
    expect(wrapper.find('[data-option-id="b"]').classes()).toContain('is-wrong');
    expect(wrapper.findAll('.option-btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    await click('[data-option-id="a"]');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Неверно');
    await click('[data-test="next"]');
    expect(wrapper.find('[data-option-id="a"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('.feedback').exists()).toBe(false);
    await click('[data-option-id="c"]');
    await click('[data-test="submit"]');
    await click('[data-test="next"]');
    await click('[data-test="previous"]');
    expect(wrapper.find('.counter').text()).toBe('Выбрано 2 из 2');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Верно!');
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
    expect(wrapper.findAll('.option-btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
    await click('[data-test="next"]');
    await click('[data-option-id="b"]');
    await click('[data-test="next"]');
    expect(wrapper.find('[data-test="score"]').text()).toBe('2 из 3');
  });

  it('возврат сохраняет порядок вариантов даже после смены настройки перемешивания', async () => {
    useSettings().setShuffle(true);
    const { wrapper } = await mountAt('/topic/t');
    await wrapper.find('[data-test="start"]').trigger('click');
    const order = wrapper.findAll('.option-btn').map((b) => b.attributes('data-option-id'));
    await wrapper.find('[data-option-id="a"]').trigger('click');
    await wrapper.find('[data-test="next"]').trigger('click');
    useSettings().setShuffle(false);
    await wrapper.find('[data-test="previous"]').trigger('click');
    expect(wrapper.findAll('.option-btn').map((b) => b.attributes('data-option-id'))).toEqual(order);
    expect(wrapper.find('.feedback__verdict').text()).toBe('Верно!');
  });

  it('назад работает в режиме обучения, результат не записывается', async () => {
    const { wrapper } = await mountAt('/topic/t');
    await wrapper.find('[data-test="study-toggle"]').setValue(true);
    await wrapper.find('[data-test="start"]').trigger('click');
    await wrapper.find('[data-test="next"]').trigger('click');
    await wrapper.find('[data-test="previous"]').trigger('click');
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 3');
    expect(wrapper.find('[data-test="explanation"]').text()).toBe('Потому что так.');
    expect(wrapper.findAll('.option-btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
  });

  it('ответ → разбор → далее → итог, счёт считается верно', async () => {
    const { wrapper } = await mountAt('/topic/t');
    const click = async (selector: string) => {
      await wrapper.find(selector).trigger('click');
      await flushPromises();
    };

    // Стартовый экран
    expect(wrapper.find('h1').text()).toBe('Тестовая тема');
    expect(wrapper.find('[data-test="start-screen"]').exists()).toBe(true);
    await click('[data-test="start"]');

    // Вопрос 1 (single): одним кликом, ошибка
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 3');
    expect(wrapper.find('[data-test="hint"]').text()).toBe('Выберите 1 вариант');
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
    expect(wrapper.find('.feedback').exists()).toBe(false);
    expect(wrapper.findAll('.option-btn').map((b) => b.text())).toEqual(['Верный', 'Неверный', 'Тоже неверный']);

    await click('[data-option-id="b"]');
    expect(wrapper.find('.feedback').classes()).toContain('feedback--bad');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Неверно');
    expect(wrapper.find('[data-test="correct-answer"]').text()).toBe('Верный');
    expect(wrapper.find('[data-test="explanation"]').text()).toBe('Потому что так.');
    expect(wrapper.find('.feedback a[href*="anchor=casting"]').exists()).toBe(true);
    expect(wrapper.find('.feedback a[href="https://example.com/source"]').exists()).toBe(true);
    expect(wrapper.findAll('.option-btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true);

    // Вопрос 2 (multiple): верно
    await click('[data-test="next"]');
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 2 из 3');
    expect(wrapper.find('[data-test="hint"]').text()).toBe('Выберите 2 варианта');
    expect(wrapper.find('[data-test="submit"]').attributes('disabled')).toBeDefined();
    await click('[data-option-id="a"]');
    await click('[data-option-id="c"]');
    expect(wrapper.find('[data-test="submit"]').attributes('disabled')).toBeUndefined();
    await click('[data-test="submit"]');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Верно!');

    // Вопрос 3 (single): верно
    await click('[data-test="next"]');
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    await click('[data-option-id="b"]');
    expect(wrapper.find('.feedback__verdict').text()).toBe('Верно!');
    expect(wrapper.find('[data-test="next"]').text()).toBe('Показать результат');

    // Итог
    await click('[data-test="next"]');
    expect(wrapper.find('[data-test="score"]').text()).toBe('2 из 3');
    expect(wrapper.find('[data-test="percent"]').text()).toBe('67%');
    const mistakes = wrapper.findAll('[data-test="mistakes"] li');
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0].text()).toContain('Первый вопрос?');
    expect(mistakes[0].find('a[href*="anchor=casting"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('К темам');

    // Пройти заново: возврат на стартовый экран
    await click('[data-test="restart"]');
    expect(wrapper.find('[data-test="start-screen"]').exists()).toBe(true);
    await click('[data-test="start"]');
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 3');
    expect(wrapper.find('.feedback').exists()).toBe(false);
  });

  it('при включённом перемешивании порядок не меняется после ответа', async () => {
    useSettings().setShuffle(true);
    const { wrapper } = await mountAt('/topic/t');
    await wrapper.find('[data-test="start"]').trigger('click');
    const before = wrapper.findAll('.option-btn').map((b) => b.text());
    await wrapper.find('.option-btn').trigger('click');
    await flushPromises();
    expect(wrapper.find('.feedback').exists()).toBe(true);
    expect(wrapper.findAll('.option-btn').map((b) => b.text())).toEqual(before);
  });

  it('несуществующая тема — «Не найдено»', async () => {
    const { wrapper } = await mountAt('/topic/unknown');
    expect(wrapper.text()).toContain('Не найдено');
  });

  it('ошибка загрузки темы — «Повторить»', async () => {
    mockFetch({ 'data/topics/t.json': 500 });
    const { wrapper } = await mountAt('/topic/t');
    expect(wrapper.text()).toContain('Повторить');
  });
});
