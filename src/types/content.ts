export type QuestionBase = {
  id: string;
  prompt: string;
  explanation: string;
  rule?: string;
  source?: string;
};

export type Option = { id: string; text: string; correct?: boolean };

export type SingleQuestion = QuestionBase & { type: 'single'; options: Option[] };
export type MultipleQuestion = QuestionBase & { type: 'multiple'; options: Option[] };
export type Question = SingleQuestion | MultipleQuestion;

export type TopicSummary = {
  id: string;
  title: string;
  description: string;
  order: number;
  questionCount: number;
};
export type Topic = TopicSummary & { questions: Question[] };

export type RuleAnchor = { id: string; title: string };
export type RuleSummary = {
  id: string;
  title: string;
  section: string;
  order: number;
  anchors: RuleAnchor[];
};
export type Rule = RuleSummary & { html: string };

export type UserAnswer =
  | { kind: 'single'; optionId: string }
  | { kind: 'multiple'; optionIds: string[] };
