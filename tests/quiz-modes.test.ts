import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { clearContentCache } from '../src/composables/useContent';
import { reloadProgress, useProgress } from '../src/composables/useProgress';
import { reloadSettings, SETTINGS_KEY, useSettings } from '../src/composables/useSettings';
import { ALL_SCOPE, RANDOM_QUIZ_SIZE, buildQuiz, progressKey } from '../src/domain/quiz';
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

  it('по всем темам: все вопросы всех тем, перемешаны, ключи уникальны', () => {
    const items = buildQuiz([a, b], { length: 'all', mixed: true }, sequential());
    expect(items).toHaveLength(35);
    expect(new Set(items.map((i) => i.key)).size).toBe(35);
    expect(new Set(items.map((i) => i.topicId))).toEqual(new Set(['a', 'b']));
    const plain = [...a.questions, ...b.questions].map((q) => q.id);
    expect(items.map((i) => i.question.id)).not.toEqual(plain);
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

describe('progressKey', () => {
  it('разные ключи для разных видов теста', () => {
    expect(progressKey('a', 'all', 30)).toBe('a');
    expect(progressKey('a', 'random', 30)).toBe('a:random');
    expect(progressKey(ALL_SCOPE, 'all', 30)).toBe('@all');
    expect(progressKey(ALL_SCOPE, 'random', 30)).toBe('@all:random');
  });

  it('если вопросов не больше 20, «случайные» пишутся под ключом «все»', () => {
    expect(progressKey('a', 'random', 20)).toBe('a');
    expect(progressKey('a', 'random', 5)).toBe('a');
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
    reloadProgress();
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
    expect(wrapper.text()).toContain('Все вопросы (25)');
    expect(wrapper.text()).toContain('20 случайных вопросов');
    await start(wrapper);
    expect(wrapper.find('[data-test="progress"]').text()).toBe('Вопрос 1 из 25');
  });

  it('«20 случайных» даёт 20 вопросов и сохраняет выбор в localStorage', async () => {
    const { wrapper } = await mountAt('/topic/t1');
    await wrapper.find('[data-test="length-random"]').setValue(true);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).quizLength).toBe('random');
    await start(wrapper);
    expect(wrapper.find('[data-test="progress"]').text()).toBe('Вопрос 1 из 20');
  });

  it('статистика «20 случайных» пишется отдельно от «все вопросы»', async () => {
    useSettings().setQuizLength('random');
    const { wrapper } = await mountAt('/topic/t1');
    await start(wrapper);
    for (let i = 0; i < 20; i++) {
      await wrapper.find('[data-option-id="a"]').trigger('click');
      await wrapper.find('[data-test="next"]').trigger('click');
      await flushPromises();
    }
    expect(wrapper.find('[data-test="score"]').text()).toBe('20 из 20');
    expect(useProgress().get('t1:random')).toMatchObject({ best: 20, total: 20 });
    expect(useProgress().get('t1')).toBeUndefined();
  });

  it('режим обучения: ответы проставлены, разбор виден сразу, статистика не пишется', async () => {
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
    expect(useProgress().get('t2')).toBeUndefined();
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

  it('тест по всем темам: вопросы всех тем, название темы, отдельная статистика', async () => {
    const { wrapper } = await mountAt('/all');
    expect(wrapper.find('h1').text()).toBe('Тест по всем темам');
    expect(wrapper.text()).toContain('Все вопросы (28)');
    await start(wrapper);
    expect(wrapper.find('[data-test="progress"]').text()).toBe('Вопрос 1 из 28');
    expect(wrapper.find('[data-test="topic-label"]').text()).toMatch(/^Тема: (Первая|Вторая)$/);

    for (let i = 0; i < 28; i++) {
      await wrapper.find('[data-option-id="a"]').trigger('click');
      await wrapper.find('[data-test="next"]').trigger('click');
      await flushPromises();
    }
    expect(wrapper.find('[data-test="score"]').text()).toBe('28 из 28');
    expect(useProgress().get(ALL_SCOPE)).toMatchObject({ best: 28, total: 28 });
    expect(useProgress().get('t1')).toBeUndefined();
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
    reloadProgress();
    mockFetch({ 'data/topics.json': summaries });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('показывает карточку со ссылкой на #/all и общим числом вопросов', async () => {
    const { wrapper } = await mountAt('/');
    const card = wrapper.find('[data-test="all-card"]');
    expect(card.exists()).toBe(true);
    expect(card.attributes('href')).toContain('/all');
    expect(card.text()).toContain('Вопросов: 28');
    expect(wrapper.find('[data-test="best-all"]').text()).toBe('Ещё не проходили');
  });

  it('показывает результаты «20 случайных» на карточках', async () => {
    useProgress().record('t1:random', 15, 20);
    useProgress().record(ALL_SCOPE, 10, 28);
    const { wrapper } = await mountAt('/');
    expect(wrapper.find('[data-test="best-random"]').text()).toBe('Случайные 20: 15 из 20');
    expect(wrapper.find('[data-test="best-all"]').text()).toBe('Лучший результат: 10 из 28');
  });
});
