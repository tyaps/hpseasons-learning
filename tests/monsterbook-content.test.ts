// @vitest-environment node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { buildContent } from '../scripts/build-content';
import type { Topic } from '../src/types/content';

const root = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(root, 'content');
const manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'monsterbook.json'), 'utf8')) as {
  cards: { id: string; title: string; images: string[]; markdownSha256: string }[];
};

describe('Монстробук: содержимое и сборка', () => {
  it('использует прямые формулировки и проверяет конкретные условные иммунитеты', () => {
    const topics = ['creatures', 'creature-attacks', 'creature-holding'].map((id) =>
      yaml.load(fs.readFileSync(path.join(contentDir, 'topics', `${id}.yaml`), 'utf8')) as Topic);
    const questions = topics.flatMap((t) => t.questions);
    for (const q of questions) {
      expect(q.prompt).not.toMatch(/какой эффект атаки описан в карточке|что указано о возможности удерживать|какой эффект Авады Кедавры указан в карточке/);
    }
    expect(questions.find((q) => q.id === 'm26-attack')?.prompt).toBe('Жаба: какой эффект атаки?');
    expect(questions.find((q) => q.id === 'm26-holding')).toBeUndefined();
    expect(questions.find((q) => q.id === 'm46-avada')?.prompt).toBe('Пеплозмей: какой эффект от Авады Кедавры?');
    const immune = questions.filter((q) => q.id.includes('-immune-'));
    expect(immune).toHaveLength(89);
    for (const q of immune) {
      expect(q.options.filter((o) => o.correct).map((o) => o.text)).toEqual(['Не действует']);
      expect(q.rule).toMatch(/^monster-\d{2}#vulnerabilities$/);
      expect(q.image).toBeDefined();
      expect(q.explanation.length).toBeGreaterThan(30);
    }
    expect(questions.find((q) => q.id === 'm11-immune-harpy-maxima')?.prompt).toContain('в форме Гарпии');
    expect(questions.find((q) => q.id === 'm16-immune-ground-stupefy')?.prompt).toContain('стоит на земле');
    expect(questions.find((q) => q.id === 'm55-immune-night-conjunctivitis')?.prompt).toContain('ночью, вне полёта');
    expect(questions.find((q) => q.id === 'm64-immune-no-salt')?.prompt).toContain('нет соли');
  });
  it('разделяет эффекты мантикоры, исключает очевидное удержание и конечные точки вариантов', () => {
    const topics = fs.readdirSync(path.join(contentDir, 'topics')).filter(f => f.endsWith('.yaml')).map(f =>
      yaml.load(fs.readFileSync(path.join(contentDir, 'topics', f), 'utf8')) as Topic);
    const questions = topics.flatMap(t => t.questions);
    for (const q of questions) for (const option of q.options) expect(option.text).not.toMatch(/\.\s*$/);
    const manticore = questions.find(q => q.id === 'm39-attack')!;
    expect(manticore.type).toBe('multiple');
    expect(manticore.options.filter(o => o.correct)).toHaveLength(6);
    expect(manticore.options.filter(o => !o.correct)).toHaveLength(6);
    expect(manticore.options.find(o => o.text === 'Хвост — паралич на 15 минут')?.correct).toBe(true);
    for (const id of ['m26-holding', 'm54-holding', 'm55-holding', 'm62-holding']) {
      expect(questions.find(q => q.id === id)).toBeUndefined();
    }
    const vampire = fs.readFileSync(path.join(contentDir, 'rules/monster-09.md'), 'utf8');
    expect(vampire).toContain('| Название | Вампир | ![Вампир](data/assets/monsters/image9.png) |\n| :---- | :---- | :---: |');
  });

  it('сохраняет весь исходный Markdown каждой карточки и все 68 изображений', () => {
    expect(manifest.cards).toHaveLength(67);
    const images = new Set<string>();
    for (const card of manifest.cards) {
      const parsed = matter(fs.readFileSync(path.join(contentDir, 'rules', `${card.id}.md`), 'utf8'));
      expect(parsed.data.title).toBe(card.title);
      expect(parsed.data.section).toBe('Монстробук');
      let original = parsed.content.slice(parsed.content.indexOf('## Описание, атака'))
        .replace('## Описание, атака и удержание {#profile}\n\n', '')
        .replace('## Уязвимости и взаимодействие с магией {#vulnerabilities}\n\n', '')
        .replace(/!\[[^\]]+\]\(data\/assets\/monsters\/(image\d+)\.[a-z]+\)/g, '![][$1]')
        .trim();
      if (card.id === 'monster-09') {
        const end = original.indexOf('\n\n');
        const profile = original.slice(0, end).split('\n').map(row => row.slice(0, row.lastIndexOf('|', row.length - 2) + 1));
        original = (profile.join('\n') + original.slice(end))
          .replace('| Непростительные | Нет |  |', '| Непростительные | Нет | ![][image9] |');
      }
      expect(createHash('sha256').update(original).digest('hex'), card.title).toBe(card.markdownSha256);
      const referenced = [...parsed.content.matchAll(/data\/assets\/monsters\/([^\s)]+)/g)].map((m) => m[1]);
      expect(referenced).toEqual(card.images);
      for (const image of card.images) {
        images.add(image);
        const bytes = fs.readFileSync(path.join(contentDir, 'assets/monsters', image));
        expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      }
    }
    expect(images.size).toBe(68);
  });

  it('собирает все ссылки и копирует изображения без изменения байтов', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hps-monsters-'));
    try {
      const result = buildContent({ contentDir, outDir });
      expect(result).toEqual({ topics: 9, rules: 74 });
      for (const card of manifest.cards) {
        const rendered = JSON.parse(fs.readFileSync(path.join(outDir, 'rules', `${card.id}.json`), 'utf8'));
        expect(rendered.html).not.toContain('data:image');
        expect(rendered.html).not.toMatch(/!\[\]\[image/);
        expect(rendered.anchors.map((a: { id: string }) => a.id)).toContain('vulnerabilities');
        for (const image of card.images) {
          expect(fs.readFileSync(path.join(outDir, 'assets/monsters', image))
            .equals(fs.readFileSync(path.join(contentDir, 'assets/monsters', image)))).toBe(true);
        }
      }
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('вопросы покрывают все карточки и не спрашивают биомы, лут, сценки и обычное поведение', () => {
    const covered = new Set<string>();
    let total = 0;
    for (const id of ['creatures', 'creature-attacks', 'creature-holding']) {
      const topic = yaml.load(fs.readFileSync(path.join(contentDir, 'topics', `${id}.yaml`), 'utf8')) as Topic;
      for (const q of topic.questions) {
        total++;
        expect(q.rule).toMatch(/^monster-\d{2}#(profile|vulnerabilities)$/);
        covered.add(q.rule!.split('#')[0]);
        const card = manifest.cards.find((c) => c.id === q.rule!.split('#')[0])!;
        expect(q.image).toEqual({ src: `assets/monsters/${card.images[0]}`, alt: card.title });
        expect(q.prompt).not.toMatch(/биом|ингредиент|лут|сценк|агрессив|место обитания|интересн.*факт/i);
      }
    }
    expect(total).toBe(418);
    expect(covered.size).toBe(67);
  });
});
