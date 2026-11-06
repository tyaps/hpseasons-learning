import type { MultipleQuestion, Question, SingleQuestion } from '../types/content';

export function correctCount(q: SingleQuestion | MultipleQuestion): number {
  return q.options.filter((o) => o.correct).length;
}

/** Склонение по-русски: forms = [1 вариант, 2 варианта, 5 вариантов]. */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

const VARIANT_FORMS: [string, string, string] = ['вариант', 'варианта', 'вариантов'];

export function selectionHint(q: Question): string {
  const n = q.type === 'single' ? 1 : correctCount(q);
  return `Выберите ${n} ${pluralRu(n, VARIANT_FORMS)}`;
}
