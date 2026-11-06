import type { Question, Topic } from '../types/content';
import { shuffle } from './shuffle';

export const RANDOM_QUIZ_SIZE = 20;
export const ALL_SCOPE = '@all';

export type QuizLength = 'random' | 'all';

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
 * - `mixed` (тест по всем темам): пул из всех тем всегда перемешивается;
 * - иначе при `all` порядок как в файле темы, при `random` — случайный порядок;
 * - при `random` берётся не более RANDOM_QUIZ_SIZE вопросов.
 */
export function buildQuiz(
  topics: Topic[],
  options: { length: QuizLength; mixed: boolean },
  rnd: () => number = Math.random,
): QuizItem[] {
  const pool = topics.flatMap(toItems);
  const ordered = options.mixed || options.length === 'random' ? shuffle(pool, rnd) : pool;
  return options.length === 'random' ? ordered.slice(0, RANDOM_QUIZ_SIZE) : ordered;
}

/** Ключ статистики (см. SPEC 7.5). */
export function progressKey(scope: string, length: QuizLength, poolSize: number): string {
  return length === 'random' && poolSize > RANDOM_QUIZ_SIZE ? `${scope}:random` : scope;
}
