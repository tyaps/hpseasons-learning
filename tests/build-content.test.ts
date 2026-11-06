// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildContent, ContentError } from '../scripts/build-content';

const RULE = `---
id: spells
title: Заклинания
section: Магия
order: 1
---
Вступление.

## Условия {#casting}

Текст.

### Без явного якоря

Ещё текст.
`;

const TOPIC = `id: t1
title: Тема
description: Описание
order: 1
questions:
  - id: q1
    type: single
    prompt: Вопрос?
    options:
      - { id: a, text: Верно, correct: true }
      - { id: b, text: Неверно }
    explanation: Потому что.
    rule: spells#casting
  - id: q2
    type: multiple
    prompt: Вопрос 2?
    options:
      - { id: a, text: A, correct: true }
      - { id: b, text: B, correct: true }
      - { id: c, text: C }
    explanation: Потому что.
`;

let root: string;
let contentDir: string;
let outDir: string;

function write(rel: string, text: string) {
  const file = path.join(contentDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}

function readOut<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(outDir, rel), 'utf8')) as T;
}

function problemsOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ContentError);
    return (e as ContentError).problems;
  }
  throw new Error('ожидалась ошибка ContentError');
}

const run = () => buildContent({ contentDir, outDir });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'hps-content-'));
  contentDir = path.join(root, 'content');
  outDir = path.join(root, 'out');
  write('rules/spells.md', RULE);
  write('topics/t1.yaml', TOPIC);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('buildContent: валидный контент', () => {
  it('создаёт все JSON-файлы', () => {
    expect(run()).toEqual({ topics: 1, rules: 1 });
    for (const f of ['topics.json', 'topics/t1.json', 'rules.json', 'rules/spells.json']) {
      expect(fs.existsSync(path.join(outDir, f))).toBe(true);
    }
  });

  it('считает questionCount и не кладёт вопросы в сводку', () => {
    run();
    const [summary] = readOut<Array<Record<string, unknown>>>('topics.json');
    expect(summary).toMatchObject({ id: 't1', questionCount: 2 });
    expect(summary).not.toHaveProperty('questions');
    const topic = readOut<{ questions: unknown[] }>('topics/t1.json');
    expect(topic.questions).toHaveLength(2);
  });

  it('строит якоря и HTML статьи', () => {
    run();
    const rule = readOut<{ html: string; anchors: { id: string; title: string }[] }>('rules/spells.json');
    expect(rule.anchors).toEqual([
      { id: 'casting', title: 'Условия' },
      { id: 'без-явного-якоря', title: 'Без явного якоря' },
    ]);
    expect(rule.html).toContain('<h2 id="casting">Условия</h2>');
    expect(rule.html).not.toContain('{#casting}');
    const summary = readOut<Array<Record<string, unknown>>>('rules.json')[0];
    expect(summary).not.toHaveProperty('html');
  });
});

describe('buildContent: ошибки контента', () => {
  it('нет explanation: указывает файл и путь', () => {
    write('topics/t1.yaml', TOPIC.replace('    explanation: Потому что.\n    rule: spells#casting\n', '    rule: spells#casting\n'));
    const problems = problemsOf(run);
    expect(problems.some((p) => p.startsWith('topics/t1.yaml: questions[0].explanation'))).toBe(true);
  });

  it('у single два верных варианта', () => {
    write('topics/t1.yaml', TOPIC.replace('- { id: b, text: Неверно }', '- { id: b, text: Тоже верно, correct: true }'));
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/topics\/t1\.yaml: questions\[0\]\.options: .*ровно один верный/);
  });

  it('дубли id вопросов', () => {
    write('topics/t1.yaml', TOPIC.replace('id: q2', 'id: q1'));
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/questions\[1\]\.id: дублируется id вопроса «q1»/);
  });

  it('дубли id вариантов', () => {
    write('topics/t1.yaml', TOPIC.replace('- { id: b, text: Неверно }', '- { id: a, text: Неверно }'));
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/options\[1\]\.id: дублируется id варианта «a»/);
  });

  it('дубли id тем', () => {
    write('topics/t1.yml', TOPIC);
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/дублируется id темы «t1»/);
  });

  it('правило ссылается на несуществующую статью', () => {
    write('topics/t1.yaml', TOPIC.replace('rule: spells#casting', 'rule: nope#x'));
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/questions\[0\]\.rule: статья «nope» не найдена/);
  });

  it('правило ссылается на несуществующий якорь', () => {
    write('topics/t1.yaml', TOPIC.replace('rule: spells#casting', 'rule: spells#missing'));
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/нет якоря «missing»/);
  });

  it('вопрос со свободным вводом (type: text) не поддерживается', () => {
    write(
      'topics/t1.yaml',
      TOPIC +
        '  - id: q3\n    type: text\n    prompt: Формула?\n    answers: [Lumos]\n    explanation: Потому что.\n',
    );
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/topics\/t1\.yaml: questions\[2\]\.type/);
  });

  it('id статьи не совпадает с именем файла', () => {
    write('rules/other.md', RULE);
    const problems = problemsOf(run);
    expect(problems.join('\n')).toMatch(/rules\/other\.md: id: должен совпадать с именем файла/);
  });

  it('не пишет JSON, если есть ошибки', () => {
    write('topics/t1.yaml', TOPIC.replace('id: t1', 'id: BAD ID'));
    problemsOf(run);
    expect(fs.existsSync(outDir)).toBe(false);
  });
});
