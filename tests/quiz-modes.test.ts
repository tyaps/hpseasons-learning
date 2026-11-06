import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { reloadSettings, SETTINGS_KEY, useSettings } from '../src/composables/useSettings';
import { RANDOM_QUIZ_SIZE, buildQuiz, parseQuizRange } from '../src/domain/quiz';
import type { Question, Topic } from '../src/types/content';
import { mockFetch, mountAt } from './helpers';

function makeTopic(id: string, title: string, count: number): Topic {
  const questions: Question[] = Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`,
    type: 'single' as const,
    prompt: `${title}: вопрос ${i + 1}`,
    options: [
      { id: 'a', text: 'Верный', correct: true },
      { id: 'b', text: 'Неверный' },
    ],
    explanation: `Объяснение ${i + 1}`,
  }));
  return { id, title, description: 'd', order: 1, questionCount: count, questions };
}

const sequential = () => {
  let i = 0;
  return () => ((i++ * 0.37) % 1) as number;
};

describe('buildQuiz', () => {
  const a = makeTopic('a', 'Тема A', 30);
  const b = makeTopic('b', 'Тема B', 5);

  it('выбирает включительный диапазон в теме и через границу тем', () => {
    expect(buildQuiz([a], { length: 'all', mixed: false, range: { from: 4, to: 6 } })
      .map((i) => i.key)).toEqual(['a/q4', 'a/q5', 'a/q6']);
    expect(buildQuiz([a, b], { length: 'all', mixed: true, range: { from: 30, to: 31 } })
      .map((i) => i.key)).toEqual(['a/q30', 'b/q1']);
    expect(buildQuiz([a], { length: 'all', mixed: false, range: { from: 30, to: 30 } }))
      .toHaveLength(1);
    expect(() => buildQuiz([a], { length: 'all', mixed: false, range: { from: 0, to: 2 } }))
      .toThrow(RangeError);
  });

  it('shuffled перемешивает все вопросы без пропусков в теме и в общем тесте', () => {
    for (const mixed of [false, true]) {
      const topics = mixed ? [a, b] : [a];
      const plain = topics.flatMap((t) => t.questions.map((q) => `${t.id}/${q.id}`));
      const items = buildQuiz(topics, { length: 'shuffled', mixed }, sequential());
      expect(items.map((i) => i.key)).not.toEqual(plain);
      expect(new Set(items.map((i) => i.key))).toEqual(new Set(plain));
      expect(items).toHaveLength(plain.length);
    }
  });

  it('тема, «все вопросы»: порядок как в файле', () => {
    const items = buildQuiz([a], { length: 'all', mixed: false });
    expect(items.map((i) => i.question.id)).toEqual(a.questions.map((q) => q.id));
  });

  it('тема, «20 случайных»: ровно 20 уникальных вопросов темы', () => {
    const items = buildQuiz([a], { length: 'random', mixed: false }, sequential());
    expect(items).toHaveLength(RANDOM_QUIZ_SIZE);
    expect(new Set(items.map((i) => i.key)).size).toBe(RANDOM_QUIZ_SIZE);
    expect(items.every((i) => i.topicId === 'a')).toBe(true);
    expect(items.map((i) => i.question.id)).not.toEqual(a.questions.slice(0, 20).map((q) => q.id));
  });

  it('если вопросов не больше 20, «20 случайных» берёт все', () => {
    const items = buildQuiz([b], { length: 'random', mixed: false }, sequential());
    expect(items).toHaveLength(5);
    expect(new Set(items.map((i) => i.key)).size).toBe(5);
  });

  it('по всем темам: режим all сохраняет порядок, ключи уникальны', () => {
    const items = buildQuiz([a, b], { length: 'all', mixed: true }, sequential());
    expect(items).toHaveLength(35);
    expect(new Set(items.map((i) => i.key)).size).toBe(35);
    expect(new Set(items.map((i) => i.topicId))).toEqual(new Set(['a', 'b']));
    const plain = [...a.questions, ...b.questions].map((q) => q.id);
    expect(items.map((i) => i.question.id)).toEqual(plain);
  });

  it('по всем темам, «20 случайных»: не более 20 вопросов', () => {
    const items = buildQuiz([a, b], { length: 'random', mixed: true }, sequential());
    expect(items).toHaveLength(RANDOM_QUIZ_SIZE);
  });

  it('не меняет исходные темы', () => {
    const before = a.questions.map((q) => q.id);
    buildQuiz([a, b], { length: 'random', mixed: true }, sequential());
    expect(a.questions.map((q) => q.id)).toEqual(before);
  });
});

describe('parseQuizRange', () => {
  it.each(['', '-1', '0', '1.5', '1e1', 'NaN', 'Infinity', ' 1', '9007199254740993', '26'])
    ('отклоняет неверную границу %j с обеих сторон', (value) => {
      expect(parseQuizRange(value, '25', 25).range).toBeNull();
      expect(parseQuizRange('1', value, 25).range).toBeNull();
    });
  it('проверяет порядок и разрешает весь пул и один вопрос', () => {
    expect(parseQuizRange('3', '2', 25).error).toContain('Начальный номер');
    expect(parseQuizRange('1', '25', 25).range).toEqual({ from: 1, to: 25 });
    expect(parseQuizRange('25', '25', 25).range).toEqual({ from: 25, to: 25 });
  });
});

describe('QuizView: режимы', () => {
  const t1 = makeTopic('t1', 'Первая', 25);
  const t2 = makeTopic('t2', 'Вторая', 3);
  const summaries = [t1, t2].map(({ questions: _q, ...s }) => s);

  const start = async (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) => {
    await wrapper.find('[data-test="start"]').trigger('click');
    await flushPromises();
  };

  beforeEach(() => {
    clearContentCache();
    localStorage.clear();
    reloadSettings();

    useSettings().setShuffle(false);
    mockFetch({
      'data/topics.json': summaries,
      'data/topics/t1.json': t1,
      'data/topics/t2.json': t2,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('стартовый экран: «все» по умолчанию, число вопросов в подписи', async () => {
    const { wrapper } = await mountAt('/topic/t1');
    expect(wrapper.find('[data-test="start-screen"]').exists()).toBe(true);
    expect((wrapper.find('[data-test="length-all"]').element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.text()).toContain('Всего вопросов: 25');
    expect(wrapper.text()).toContain('20 случайных вопросов');
    await start(wrapper);
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 25');
  });

  it('поля блокируют неверный диапазон; другие режимы его не используют', async () => {
    const { wrapper } = await mountAt('/topic/t1');
    expect((wrapper.find('[data-test="range-from"]').element as HTMLInputElement).value).toBe('1');
    expect((wrapper.find('[data-test="range-to"]').element as HTMLInputElement).value).toBe('25');
    for (const value of ['', '0', '-1', '1.5', '1e1', '26']) {
      await wrapper.find('[data-test="range-from"]').setValue(value);
      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="start"]').attributes('disabled')).toBeDefined();
    }
    await wrapper.find('[data-test="range-from"]').setValue('5');
    await wrapper.find('[data-test="range-to"]').setValue('4');
    expect(wrapper.find('[role="alert"]').text()).toContain('Начальный номер');
    await wrapper.find('[data-test="length-shuffled"]').setValue(true);
    expect(wrapper.find('[data-test="range-from"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="start"]').attributes('disabled')).toBeUndefined();
    await start(wrapper);
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 25');
  });

  it('проходит выбранный диапазон, сохраняет границы при повторе', async () => {
    const { wrapper } = await mountAt('/topic/t1');
    await wrapper.find('[data-test="range-from"]').setValue('4');
    await wrapper.find('[data-test="range-to"]').setValue('5');
    await start(wrapper);
    expect(wrapper.find('.question__prompt').text()).toBe('Первая: вопрос 4');
    expect(wrapper.find('[data-test="original-number"]').text()).toBe('№ 4 в полном списке');
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 2');
    for (let i = 0; i < 2; i++) {
      await wrapper.find('[data-option-id="a"]').trigger('click');
      await wrapper.find('[data-test="next"]').trigger('click');
    }
    expect(wrapper.find('[data-test="score"]').text()).toBe('2 из 2');
    await wrapper.find('[data-test="restart"]').trigger('click');
    expect((wrapper.find('[data-test="range-from"]').element as HTMLInputElement).value).toBe('4');
    expect((wrapper.find('[data-test="range-to"]').element as HTMLInputElement).value).toBe('5');
  });

  it('«20 случайных» даёт 20 вопросов и сохраняет выбор в localStorage', async () => {
    const { wrapper } = await mountAt('/topic/t1');
    await wrapper.find('[data-test="length-random"]').setValue(true);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).quizLength).toBe('random');
    await start(wrapper);
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 20');
  });

  it('третий вариант shuffled выбирается, сохраняется и включает все вопросы', async () => {
    const { wrapper } = await mountAt('/topic/t1');
    expect(wrapper.findAll('input[name="quiz-length"]')).toHaveLength(3);
    expect(wrapper.text()).toContain('Все вопросы (в одинаковом порядке)');
    expect(wrapper.text()).toContain('Все вопросы (в случайном порядке)');
    await wrapper.find('[data-test="length-shuffled"]').setValue(true);
    reloadSettings();
    expect(useSettings().settings.value.quizLength).toBe('shuffled');
    await start(wrapper);
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 25');
  });

  it('показывает результат текущего теста из 20 случайных вопросов', async () => {
    useSettings().setQuizLength('random');
    const { wrapper } = await mountAt('/topic/t1');
    await start(wrapper);
    for (let i = 0; i < 20; i++) {
      await wrapper.find('[data-option-id="a"]').trigger('click');
      await wrapper.find('[data-test="next"]').trigger('click');
      await flushPromises();
    }
    expect(wrapper.find('[data-test="score"]').text()).toBe('20 из 20');
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
  });

  it('режим обучения: ответы проставлены, разбор виден сразу', async () => {
    const { wrapper } = await mountAt('/topic/t2');
    await wrapper.find('[data-test="study-toggle"]').setValue(true);
    await start(wrapper);

    expect(wrapper.find('[data-test="study-badge"]').exists()).toBe(true);
    expect(wrapper.find('[data-option-id="a"]').classes()).toContain('is-correct');
    expect(wrapper.findAll('.option-btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.find('.feedback').exists()).toBe(true);
    expect(wrapper.find('.feedback__verdict').exists()).toBe(false);
    expect(wrapper.find('[data-test="explanation"]').text()).toBe('Объяснение 1');
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);

    for (let i = 0; i < 3; i++) {
      await wrapper.find('[data-test="next"]').trigger('click');
      await flushPromises();
    }
    expect(wrapper.find('[data-test="study-done"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Просмотрено вопросов: 3');
    expect(wrapper.find('[data-test="score"]').exists()).toBe(false);
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
  });

  it('режим обучения со многими вариантами: подсвечены все верные', async () => {
    const multi: Topic = {
      ...t2,
      questions: [
        {
          id: 'm',
          type: 'multiple',
          prompt: 'Несколько?',
          options: [
            { id: 'a', text: 'Раз', correct: true },
            { id: 'b', text: 'Два' },
            { id: 'c', text: 'Три', correct: true },
          ],
          explanation: 'e',
        },
      ],
    };
    mockFetch({ 'data/topics.json': summaries, 'data/topics/t2.json': multi });
    const { wrapper } = await mountAt('/topic/t2');
    await wrapper.find('[data-test="study-toggle"]').setValue(true);
    await start(wrapper);
    expect(wrapper.find('[data-option-id="a"]').classes()).toContain('is-correct');
    expect(wrapper.find('[data-option-id="c"]').classes()).toContain('is-correct');
    expect(wrapper.find('[data-option-id="b"]').classes()).not.toContain('is-correct');
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
  });

  it('тест по всем темам: вопросы всех тем, название темы', async () => {
    const { wrapper } = await mountAt('/all');
    expect(wrapper.find('h1').text()).toBe('Тест по всем темам');
    expect(wrapper.text()).toContain('Всего вопросов: 28');
    await start(wrapper);
    expect(wrapper.find('[data-test="question-position"]').text()).toBe('Вопрос 1 из 28');
    expect(wrapper.find('[data-test="topic-label"]').text()).toMatch(/^Тема: (Первая|Вторая)$/);

    for (let i = 0; i < 28; i++) {
      await wrapper.find('[data-option-id="a"]').trigger('click');
      await wrapper.find('[data-test="next"]').trigger('click');
      await flushPromises();
    }
    expect(wrapper.find('[data-test="score"]').text()).toBe('28 из 28');
  });

  it('тест по теме не показывает название темы над вопросом', async () => {
    const { wrapper } = await mountAt('/topic/t2');
    await start(wrapper);
    expect(wrapper.find('[data-test="topic-label"]').exists()).toBe(false);
  });

  it('«Пройти заново» возвращает на стартовый экран', async () => {
    const { wrapper } = await mountAt('/topic/t2');
    await start(wrapper);
    for (let i = 0; i < 3; i++) {
      await wrapper.find('[data-option-id="a"]').trigger('click');
      await wrapper.find('[data-test="next"]').trigger('click');
      await flushPromises();
    }
    await wrapper.find('[data-test="restart"]').trigger('click');
    expect(wrapper.find('[data-test="start-screen"]').exists()).toBe(true);
  });
});

describe('Главная: тест по всем темам', () => {
  const t1 = makeTopic('t1', 'Первая', 25);
  const t2 = makeTopic('t2', 'Вторая', 3);
  const summaries = [t1, t2].map(({ questions: _q, ...s }) => s);

  beforeEach(() => {
    clearContentCache();
    localStorage.clear();
    reloadSettings();

    mockFetch({ 'data/topics.json': summaries });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('удаляет старые результаты, сохраняя настройки, и не показывает рекорды и сброс', async () => {
    localStorage.setItem('hps-progress-v1', JSON.stringify({ version: 1, topics: { t1: { best: 25, last: 25, total: 25 } } }));
    useSettings().setQuizLength('random');
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    const { wrapper } = await mountAt('/');
    expect(localStorage.getItem('hps-progress-v1')).toBeNull();
    expect(localStorage.getItem(SETTINGS_KEY)).toBe(savedSettings);
    expect(wrapper.text()).not.toMatch(/Лучший результат|Ещё не проходили|Сбросить прогресс/);
    expect(wrapper.find('[data-test="reset"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('показывает карточку со ссылкой на #/all и общим числом вопросов', async () => {
    const { wrapper } = await mountAt('/');
    const card = wrapper.find('[data-test="all-card"]');
    expect(card.exists()).toBe(true);
    expect(card.attributes('href')).toContain('/all');
    expect(card.text()).toContain('Вопросов: 28');
  });


});
