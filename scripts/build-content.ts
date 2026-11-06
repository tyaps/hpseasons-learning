import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import type { ZodIssue } from 'zod';
import { ruleFrontmatterSchema, topicSchema } from './schema';
import type { Rule, RuleAnchor, Topic, TopicSummary, RuleSummary, Question } from '../src/types/content';

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Ошибки в контенте (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
    this.name = 'ContentError';
  }
}

export type BuildOptions = { contentDir: string; outDir: string };
export type BuildResult = { topics: number; rules: number };

function formatPath(p: (string | number)[]): string {
  if (p.length === 0) return '(корень)';
  return p.reduce<string>((acc, part) => {
    if (typeof part === 'number') return `${acc}[${part}]`;
    return acc ? `${acc}.${part}` : part;
  }, '');
}

function formatIssues(file: string, issues: ZodIssue[]): string[] {
  return issues.map((i) => `${file}: ${formatPath(i.path)}: ${i.message}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const EXPLICIT_ANCHOR = /\s*\{#([\p{L}\p{N}_-]+)\}\s*$/u;

function renderRuleBody(
  md: MarkdownIt,
  body: string,
  file: string,
  problems: string[],
): { html: string; anchors: RuleAnchor[] } {
  const tokens = md.parse(body, {});
  const anchors: RuleAnchor[] = [];
  const used = new Set<string>();

  tokens.forEach((token, i) => {
    if (token.type !== 'heading_open' || (token.tag !== 'h2' && token.tag !== 'h3')) return;
    const inline = tokens[i + 1];
    if (!inline || inline.type !== 'inline') return;

    const match = inline.content.match(EXPLICIT_ANCHOR);
    if (match) {
      inline.content = inline.content.replace(EXPLICIT_ANCHOR, '');
      const last = inline.children?.[inline.children.length - 1];
      if (last && last.type === 'text') last.content = last.content.replace(EXPLICIT_ANCHOR, '');
    }
    const title = inline.content.trim();

    let id: string;
    if (match) {
      id = match[1];
      if (used.has(id)) problems.push(`${file}: заголовок «${title}»: дублируется якорь «${id}»`);
    } else {
      const base = slugify(title) || 'section';
      id = base;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    token.attrSet('id', id);
    anchors.push({ id, title });
  });

  return { html: md.renderer.render(tokens, md.options, {}), anchors };
}

function readSorted(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .sort();
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function buildContent({ contentDir, outDir }: BuildOptions): BuildResult {
  const problems: string[] = [];
  const md = new MarkdownIt({ html: false, linkify: true });

  const rules: Rule[] = [];
  const rulesDir = path.join(contentDir, 'rules');
  for (const name of readSorted(rulesDir, '.md')) {
    const file = `rules/${name}`;
    try {
      const parsed = matter(fs.readFileSync(path.join(rulesDir, name), 'utf8'));
      const fm = ruleFrontmatterSchema.safeParse(parsed.data);
      if (!fm.success) {
        problems.push(...formatIssues(file, fm.error.issues));
        continue;
      }
      if (fm.data.id !== path.basename(name, '.md')) {
        problems.push(`${file}: id: должен совпадать с именем файла («${path.basename(name, '.md')}»)`);
      }
      const { html, anchors } = renderRuleBody(md, parsed.content, file, problems);
      rules.push({ ...fm.data, anchors, html });
    } catch (e) {
      problems.push(`${file}: ${(e as Error).message}`);
    }
  }

  const ruleIds = new Set<string>();
  for (const r of rules) {
    if (ruleIds.has(r.id)) problems.push(`rules: дублируется id статьи «${r.id}»`);
    ruleIds.add(r.id);
  }

  const topics: Topic[] = [];
  const topicsDir = path.join(contentDir, 'topics');
  for (const name of [...readSorted(topicsDir, '.yaml'), ...readSorted(topicsDir, '.yml')]) {
    const file = `topics/${name}`;
    try {
      const raw = yaml.load(fs.readFileSync(path.join(topicsDir, name), 'utf8'));
      const parsed = topicSchema.safeParse(raw);
      if (!parsed.success) {
        problems.push(...formatIssues(file, parsed.error.issues));
        continue;
      }
      const t = parsed.data;
      if (t.id !== path.basename(name).replace(/\.ya?ml$/, '')) {
        problems.push(`${file}: id: должен совпадать с именем файла`);
      }
      t.questions.forEach((q, qi) => {
        if (!q.rule) return;
        const [ruleId, anchor] = q.rule.split('#');
        const rule = rules.find((r) => r.id === ruleId);
        const where = `${file}: ${formatPath(['questions', qi, 'rule'])}`;
        if (!rule) {
          problems.push(`${where}: статья «${ruleId}» не найдена`);
        } else if (anchor && !rule.anchors.some((a) => a.id === anchor)) {
          problems.push(`${where}: в статье «${ruleId}» нет якоря «${anchor}»`);
        }
      });
      topics.push({ ...t, questionCount: t.questions.length, questions: t.questions as Question[] });
    } catch (e) {
      problems.push(`${file}: ${(e as Error).message}`);
    }
  }

  const topicIds = new Set<string>();
  for (const t of topics) {
    if (topicIds.has(t.id)) problems.push(`topics: дублируется id темы «${t.id}»`);
    topicIds.add(t.id);
  }

  if (problems.length > 0) throw new ContentError(problems);

  topics.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
  rules.sort(
    (a, b) => a.section.localeCompare(b.section, 'ru') || a.order - b.order || a.title.localeCompare(b.title, 'ru'),
  );

  fs.rmSync(outDir, { recursive: true, force: true });

  const topicSummaries: TopicSummary[] = topics.map(({ questions: _q, ...summary }) => summary);
  writeJson(path.join(outDir, 'topics.json'), topicSummaries);
  for (const t of topics) writeJson(path.join(outDir, 'topics', `${t.id}.json`), t);

  const ruleSummaries: RuleSummary[] = rules.map(({ html: _h, ...summary }) => summary);
  writeJson(path.join(outDir, 'rules.json'), ruleSummaries);
  for (const r of rules) writeJson(path.join(outDir, 'rules', `${r.id}.json`), r);

  return { topics: topics.length, rules: rules.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const result = buildContent({
      contentDir: path.join(root, 'content'),
      outDir: path.join(root, 'public', 'data'),
    });
    console.log(`Контент собран: тем — ${result.topics}, статей правил — ${result.rules}`);
  } catch (e) {
    if (e instanceof ContentError) {
      console.error(e.message);
    } else {
      console.error(e);
    }
    process.exit(1);
  }
}
