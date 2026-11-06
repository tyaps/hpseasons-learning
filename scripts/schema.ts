import { z } from 'zod';

const slugId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'допустимы строчные латинские буквы, цифры и дефис');

const localId = z.string().regex(/^[A-Za-z0-9_-]+$/, 'допустимы латинские буквы, цифры, «_» и «-»');

const nonEmpty = z.string().trim().min(1, 'не может быть пустым');

const optionSchema = z
  .object({
    id: localId,
    text: nonEmpty,
    correct: z.boolean().optional(),
  })
  .strict();

const baseShape = {
  id: localId,
  prompt: nonEmpty,
  explanation: nonEmpty,
  rule: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*(#.+)?$/, 'формат: <id статьи> или <id статьи>#<якорь>')
    .optional(),
  source: z.string().url('должен быть URL').optional(),
  image: z.object({
    src: z.string().regex(/^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|gif|webp)$/, 'ожидается локальное изображение assets/...'),
    alt: nonEmpty,
  }).strict().optional(),
};

const singleSchema = z
  .object({ ...baseShape, type: z.literal('single'), options: z.array(optionSchema).min(2) })
  .strict();

const multipleSchema = z
  .object({ ...baseShape, type: z.literal('multiple'), options: z.array(optionSchema).min(2) })
  .strict();

export const questionSchema = z.discriminatedUnion('type', [singleSchema, multipleSchema]);

export const topicSchema = z
  .object({
    id: slugId,
    title: nonEmpty,
    description: nonEmpty,
    order: z.number().int(),
    questions: z.array(questionSchema).min(1),
  })
  .strict()
  .superRefine((topic, ctx) => {
    const questionIds = new Set<string>();
    topic.questions.forEach((q, qi) => {
      if (questionIds.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', qi, 'id'],
          message: `дублируется id вопроса «${q.id}»`,
        });
      }
      questionIds.add(q.id);

      const optionIds = new Set<string>();
      q.options.forEach((o, oi) => {
        if (optionIds.has(o.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['questions', qi, 'options', oi, 'id'],
            message: `дублируется id варианта «${o.id}»`,
          });
        }
        optionIds.add(o.id);
      });
      const correct = q.options.filter((o) => o.correct).length;
      if (q.type === 'single' && correct !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', qi, 'options'],
          message: `у вопроса single должен быть ровно один верный вариант, сейчас: ${correct}`,
        });
      }
      if (q.type === 'multiple' && correct < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', qi, 'options'],
          message: 'у вопроса multiple должен быть хотя бы один верный вариант',
        });
      }
    });
  });

export const ruleFrontmatterSchema = z
  .object({
    id: slugId,
    title: nonEmpty,
    section: nonEmpty,
    order: z.number().int(),
  })
  .strict();

export type TopicSource = z.infer<typeof topicSchema>;
export type RuleFrontmatter = z.infer<typeof ruleFrontmatterSchema>;
