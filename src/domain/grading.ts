import type { Question, UserAnswer } from '../types/content';

export function isCorrect(q: Question, a: UserAnswer): boolean {
  if (q.type !== a.kind) return false;

  if (q.type === 'single' && a.kind === 'single') {
    return q.options.some((o) => o.correct && o.id === a.optionId);
  }

  if (q.type === 'multiple' && a.kind === 'multiple') {
    const expected = new Set(q.options.filter((o) => o.correct).map((o) => o.id));
    const actual = new Set(a.optionIds);
    return expected.size === actual.size && [...expected].every((id) => actual.has(id));
  }

  return false;
}

/** Текст правильного ответа для разбора. */
export function correctAnswerText(q: Question): string {
  return q.options
    .filter((o) => o.correct)
    .map((o) => o.text)
    .join('; ');
}

/** Правильный ответ в виде ответа пользователя (для режима обучения). */
export function correctAnswer(q: Question): UserAnswer {
  const ids = q.options.filter((o) => o.correct).map((o) => o.id);
  return q.type === 'single'
    ? { kind: 'single', optionId: ids[0] }
    : { kind: 'multiple', optionIds: ids };
}
