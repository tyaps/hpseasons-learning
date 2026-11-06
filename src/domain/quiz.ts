import type { Question, Topic } from '../types/content';
import { shuffle } from './shuffle';

export const RANDOM_QUIZ_SIZE = 20;

export type QuizLength = 'random' | 'all' | 'shuffled';
export type QuizRange = { from: number; to: number };

export function isValidQuizRange(range: QuizRange, total: number): boolean {
  return Number.isSafeInteger(range.from) && Number.isSafeInteger(range.to)
    && range.from >= 1 && range.from <= range.to && range.to <= total;
}

export function parseQuizRange(from: string, to: string, total: number): { range: QuizRange | null; error: string | null } {
  if (!/^\d+$/.test(from) || !/^\d+$/.test(to)) {
    return { range: null, error: 'Введите целые номера вопросов в оба поля.' };
  }
  const range = { from: Number(from), to: Number(to) };
  if (!Number.isSafeInteger(range.from) || !Number.isSafeInteger(range.to) || range.from < 1 || range.to < 1 || range.from > total || range.to > total) {
    return { range: null, error: `Номера вопросов должны быть от 1 до ${total}.` };
  }
  if (range.from > range.to) {
    return { range: null, error: 'Начальный номер не должен быть больше конечного.' };
  }
  return { range, error: null };
}

/** Вопрос внутри теста. `key` уникален в пределах теста: id вопросов уникальны только внутри темы. */
export type QuizItem = {
  key: string;
  topicId: string;
  topicTitle: string;
  question: Question;
};

export function toItems(topic: Topic): QuizItem[] {
  return topic.questions.map((question) => ({
    key: `${topic.id}/${question.id}`,
    topicId: topic.id,
    topicTitle: topic.title,
    question,
  }));
}

/**
 * Собирает тест.
 * - `all` сохраняет порядок тем и вопросов в контенте;
 * - `shuffled` и `random` перемешивают весь пул;
 * - при `random` берётся не более RANDOM_QUIZ_SIZE вопросов.
 */
export function buildQuiz(
  topics: Topic[],
  options: { length: QuizLength; mixed: boolean; range?: QuizRange },
  rnd: () => number = Math.random,
): QuizItem[] {
  const pool = topics.flatMap(toItems);
  if (options.length === 'all' && options.range) {
    if (!isValidQuizRange(options.range, pool.length)) throw new RangeError('Некорректный диапазон вопросов');
    return pool.slice(options.range.from - 1, options.range.to);
  }
  const ordered = options.length === 'all' ? pool : shuffle(pool, rnd);
  return options.length === 'random' ? ordered.slice(0, RANDOM_QUIZ_SIZE) : ordered;
}
