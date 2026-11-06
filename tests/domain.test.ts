import { describe, expect, it } from 'vitest';
import { correctAnswer, correctAnswerText, isCorrect } from '../src/domain/grading';
import { correctCount, pluralRu, selectionHint } from '../src/domain/hints';
import { shuffle } from '../src/domain/shuffle';
import { ruleLocation } from '../src/domain/links';
import type { MultipleQuestion, SingleQuestion } from '../src/types/content';

const single: SingleQuestion = {
  id: 'q1',
  type: 'single',
  prompt: 'p',
  explanation: 'e',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B', correct: true },
    { id: 'c', text: 'C' },
  ],
};

const multiple: MultipleQuestion = {
  id: 'q2',
  type: 'multiple',
  prompt: 'p',
  explanation: 'e',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C', correct: true },
  ],
};


describe('isCorrect', () => {
  it('single: верный и неверный вариант', () => {
    expect(isCorrect(single, { kind: 'single', optionId: 'b' })).toBe(true);
    expect(isCorrect(single, { kind: 'single', optionId: 'a' })).toBe(false);
    expect(isCorrect(single, { kind: 'single', optionId: 'zzz' })).toBe(false);
  });

  it('multiple: точное совпадение множеств, порядок не важен', () => {
    expect(isCorrect(multiple, { kind: 'multiple', optionIds: ['c', 'a'] })).toBe(true);
    expect(isCorrect(multiple, { kind: 'multiple', optionIds: ['a'] })).toBe(false);
    expect(isCorrect(multiple, { kind: 'multiple', optionIds: ['a', 'c', 'b'] })).toBe(false);
    expect(isCorrect(multiple, { kind: 'multiple', optionIds: ['a', 'b'] })).toBe(false);
    expect(isCorrect(multiple, { kind: 'multiple', optionIds: [] })).toBe(false);
  });

  it('несовпадающий тип ответа неверен', () => {
    expect(isCorrect(single, { kind: 'multiple', optionIds: ['b'] })).toBe(false);
    expect(isCorrect(multiple, { kind: 'single', optionId: 'a' })).toBe(false);
  });
});

describe('correctAnswer', () => {
  it('возвращает ответ, который isCorrect считает верным', () => {
    expect(correctAnswer(single)).toEqual({ kind: 'single', optionId: 'b' });
    expect(correctAnswer(multiple)).toEqual({ kind: 'multiple', optionIds: ['a', 'c'] });
    expect(isCorrect(single, correctAnswer(single))).toBe(true);
    expect(isCorrect(multiple, correctAnswer(multiple))).toBe(true);
  });
});

describe('correctAnswerText', () => {
  it('склеивает верные варианты', () => {
    expect(correctAnswerText(single)).toBe('B');
    expect(correctAnswerText(multiple)).toBe('A; C');
  });
});

describe('pluralRu', () => {
  const forms: [string, string, string] = ['вариант', 'варианта', 'вариантов'];
  it.each([
    [1, 'вариант'],
    [2, 'варианта'],
    [4, 'варианта'],
    [5, 'вариантов'],
    [11, 'вариантов'],
    [12, 'вариантов'],
    [14, 'вариантов'],
    [21, 'вариант'],
    [22, 'варианта'],
    [25, 'вариантов'],
    [101, 'вариант'],
    [111, 'вариантов'],
  ])('%i → %s', (n, expected) => {
    expect(pluralRu(n, forms)).toBe(expected);
  });
});

describe('selectionHint / correctCount', () => {
  it('single — всегда «Выберите 1 вариант»', () => {
    expect(selectionHint(single)).toBe('Выберите 1 вариант');
  });

  it('multiple — по числу верных вариантов', () => {
    expect(correctCount(multiple)).toBe(2);
    expect(selectionHint(multiple)).toBe('Выберите 2 варианта');
    const five: MultipleQuestion = {
      ...multiple,
      options: Array.from({ length: 6 }, (_, i) => ({ id: `o${i}`, text: `${i}`, correct: i < 5 })),
    };
    expect(selectionHint(five)).toBe('Выберите 5 вариантов');
  });
});

describe('shuffle', () => {
  it('возвращает копию с теми же элементами и не меняет исходный массив', () => {
    const src = [1, 2, 3, 4, 5];
    const result = shuffle(src, () => 0.3);
    expect(result).not.toBe(src);
    expect([...result].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });

  it('использует переданный генератор (детерминированно)', () => {
    expect(shuffle([1, 2, 3], () => 0)).toEqual(shuffle([1, 2, 3], () => 0));
    expect(shuffle([1, 2, 3], () => 0)).not.toEqual([1, 2, 3]);
  });
});

describe('ruleLocation', () => {
  it('разбирает «статья#якорь»', () => {
    expect(ruleLocation('spells#casting')).toEqual({ path: '/rules/spells', query: { anchor: 'casting' } });
    expect(ruleLocation('spells')).toEqual({ path: '/rules/spells' });
  });
});
