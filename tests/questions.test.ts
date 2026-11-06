import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MultipleChoice from '../src/components/questions/MultipleChoice.vue';
import QuestionRenderer from '../src/components/questions/QuestionRenderer.vue';
import SingleChoice from '../src/components/questions/SingleChoice.vue';
import { reloadSettings, useSettings } from '../src/composables/useSettings';
import type { MultipleQuestion, Option, SingleQuestion } from '../src/types/content';

const options: Option[] = [
  { id: 'a', text: 'Первый', correct: true },
  { id: 'b', text: 'Второй' },
  { id: 'c', text: 'Третий', correct: true },
  { id: 'd', text: 'Четвёртый' },
];

beforeEach(() => {
  localStorage.clear();
  reloadSettings();
});

it('показывает локальную иллюстрацию существа и сохраняет её при разборе ответа', async () => {
  const question: SingleQuestion = {
    id: 'm', type: 'single', prompt: 'Авгур: эффект?', explanation: 'Разбор',
    options: [{ id: 'a', text: 'Верно', correct: true }, { id: 'b', text: 'Ошибка' }],
    image: { src: 'assets/monsters/image1.png', alt: 'Авгур' },
  };
  const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
  expect(wrapper.find('img').attributes('src')).toBe(`${import.meta.env.BASE_URL}data/assets/monsters/image1.png`);
  expect(wrapper.find('img').attributes('alt')).toBe('Авгур');
  await wrapper.setProps({ locked: true, answer: { kind: 'single', optionId: 'a' } });
  expect(wrapper.find('img').attributes('alt')).toBe('Авгур');
});

describe('SingleChoice', () => {
  const opts = options.map((o) => ({ ...o, correct: o.id === 'b' }));

  it('один клик по варианту сразу отправляет ответ', async () => {
    const wrapper = mount(SingleChoice, { props: { options: opts, locked: false } });
    await wrapper.find('[data-option-id="b"]').trigger('click');
    expect(wrapper.emitted('answer')).toEqual([[{ kind: 'single', optionId: 'b' }]]);
  });

  it('кнопки «Ответить» нет', () => {
    const wrapper = mount(SingleChoice, { props: { options: opts, locked: false } });
    expect(wrapper.text()).not.toContain('Ответить');
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
  });

  it('после ответа варианты заблокированы и подсвечены', async () => {
    const wrapper = mount(SingleChoice, {
      props: { options: opts, locked: true, answer: { kind: 'single', optionId: 'a' } },
    });
    expect(wrapper.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.find('[data-option-id="b"]').classes()).toContain('is-correct');
    expect(wrapper.find('[data-option-id="a"]').classes()).toContain('is-wrong');
    await wrapper.find('[data-option-id="c"]').trigger('click');
    expect(wrapper.emitted('answer')).toBeUndefined();
  });
});

describe('MultipleChoice', () => {
  const submit = (w: ReturnType<typeof mount>) => w.find('[data-test="submit"]');

  it('показывает счётчик «Выбрано X из N»', async () => {
    const wrapper = mount(MultipleChoice, { props: { options, locked: false } });
    expect(wrapper.find('.counter').text()).toBe('Выбрано 0 из 2');
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('.counter').text()).toBe('Выбрано 1 из 2');
  });

  it('«Ответить» активна только при выборе ровно N вариантов', async () => {
    const wrapper = mount(MultipleChoice, { props: { options, locked: false } });
    expect(submit(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(submit(wrapper).attributes('disabled')).toBeDefined();

    await wrapper.find('[data-option-id="b"]').trigger('click');
    expect(submit(wrapper).attributes('disabled')).toBeUndefined();

    await wrapper.find('[data-option-id="c"]').trigger('click');
    expect(wrapper.find('.counter').text()).toBe('Выбрано 3 из 2');
    expect(submit(wrapper).attributes('disabled')).toBeDefined();
  });

  it('отправляет выбранные id и меняет aria-pressed', async () => {
    const wrapper = mount(MultipleChoice, { props: { options, locked: false } });
    await wrapper.find('[data-option-id="a"]').trigger('click');
    await wrapper.find('[data-option-id="c"]').trigger('click');
    expect(wrapper.find('[data-option-id="a"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('[data-option-id="b"]').attributes('aria-pressed')).toBe('false');
    await submit(wrapper).trigger('click');
    expect(wrapper.emitted('answer')).toEqual([[{ kind: 'multiple', optionIds: ['a', 'c'] }]]);
  });

  it('повторный клик снимает выбор', async () => {
    const wrapper = mount(MultipleChoice, { props: { options, locked: false } });
    await wrapper.find('[data-option-id="a"]').trigger('click');
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.find('.counter').text()).toBe('Выбрано 0 из 2');
  });

  it('после ответа варианты заблокированы, кнопки нет', () => {
    const wrapper = mount(MultipleChoice, {
      props: { options, locked: true, answer: { kind: 'multiple', optionIds: ['a', 'b'] } },
    });
    expect(submit(wrapper).exists()).toBe(false);
    expect(wrapper.find('[data-option-id="b"]').classes()).toContain('is-wrong');
    expect(wrapper.find('[data-option-id="c"]').classes()).toContain('is-correct');
  });
});


describe('QuestionRenderer: подсказка и тип компонента', () => {
  const base = { id: 'q', prompt: 'Вопрос?', explanation: 'e' };

  it('single: «Выберите 1 вариант», кнопка «Ответить» отсутствует', () => {
    const question: SingleQuestion = { ...base, type: 'single', options: options.map((o) => ({ ...o, correct: o.id === 'a' })) };
    const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
    expect(wrapper.find('[data-test="hint"]').text()).toBe('Выберите 1 вариант');
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
  });

  it('multiple: «Выберите 2 варианта»', () => {
    const question: MultipleQuestion = { ...base, type: 'multiple', options };
    const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
    expect(wrapper.find('[data-test="hint"]').text()).toBe('Выберите 2 варианта');
    expect(wrapper.find('.counter').exists()).toBe(true);
  });

  it('пробрасывает событие answer от дочернего компонента', async () => {
    useSettings().setShuffle(false);
    const question: SingleQuestion = { ...base, type: 'single', options: options.map((o) => ({ ...o, correct: o.id === 'a' })) };
    const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
    await wrapper.find('[data-option-id="a"]').trigger('click');
    expect(wrapper.emitted('answer')).toEqual([[{ kind: 'single', optionId: 'a' }]]);
  });

  it('при выключенном перемешивании порядок как в YAML', () => {
    useSettings().setShuffle(false);
    const question: MultipleQuestion = { ...base, type: 'multiple', options };
    for (let i = 0; i < 5; i++) {
      const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
      expect(wrapper.findAll('.option-btn').map((b) => b.text())).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый']);
    }
  });
});
