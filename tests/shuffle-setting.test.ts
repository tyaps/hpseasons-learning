import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionRenderer from '../src/components/questions/QuestionRenderer.vue';
import ShuffleToggle from '../src/components/ShuffleToggle.vue';
import { reloadSettings, SETTINGS_KEY, useSettings } from '../src/composables/useSettings';
import { shuffle } from '../src/domain/shuffle';
import type { SingleQuestion } from '../src/types/content';

vi.mock('../src/domain/shuffle', () => ({
  shuffle: vi.fn(<T>(items: readonly T[]) => [...items].reverse()),
}));

const question: SingleQuestion = {
  id: 'q',
  type: 'single',
  prompt: 'Вопрос?',
  explanation: 'e',
  options: [
    { id: 'a', text: 'Первый', correct: true },
    { id: 'b', text: 'Второй' },
    { id: 'c', text: 'Третий' },
  ],
};

const order = (w: ReturnType<typeof mount>) => w.findAll('.option-btn').map((b) => b.text());

beforeEach(() => {
  localStorage.clear();
  reloadSettings();
  vi.mocked(shuffle).mockClear();
});

describe('перемешивание вариантов', () => {
  it('включено (по умолчанию): вызывается shuffle', () => {
    const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
    expect(shuffle).toHaveBeenCalledTimes(1);
    expect(order(wrapper)).toEqual(['Третий', 'Второй', 'Первый']);
  });

  it('выключено: shuffle не вызывается, порядок как в YAML', () => {
    useSettings().setShuffle(false);
    const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
    expect(shuffle).not.toHaveBeenCalled();
    expect(order(wrapper)).toEqual(['Первый', 'Второй', 'Третий']);
  });

  it('порядок не меняется при показе разбора и смене настройки', async () => {
    const wrapper = mount(QuestionRenderer, { props: { question, locked: false } });
    const before = order(wrapper);
    useSettings().setShuffle(false);
    await wrapper.setProps({ locked: true, answer: { kind: 'single', optionId: 'a' } });
    expect(order(wrapper)).toEqual(before);
    expect(shuffle).toHaveBeenCalledTimes(1);
  });
});

describe('ShuffleToggle', () => {
  it('отражает настройку и сохраняет изменение', async () => {
    const wrapper = mount(ShuffleToggle);
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(wrapper.text()).toContain('Перемешивать варианты ответов');
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);

    await checkbox.setValue(false);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ shuffleOptions: false });

    reloadSettings();
    const again = mount(ShuffleToggle);
    expect((again.find('input').element as HTMLInputElement).checked).toBe(false);
  });
});
