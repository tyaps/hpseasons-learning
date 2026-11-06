import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import ThemeSelector from '../src/components/ThemeSelector.vue';
import { parseSettings, reloadSettings, SETTINGS_KEY, useSettings } from '../src/composables/useSettings';

beforeEach(() => {
  localStorage.clear();
  reloadSettings();
});

describe('useSettings', () => {
  it('по умолчанию перемешивание включено, длина «все», тема «dossier»', () => {
    expect(useSettings().settings.value.shuffleOptions).toBe(true);
    expect(useSettings().settings.value.quizLength).toBe('all');
    expect(useSettings().settings.value.theme).toBe('dossier');
    expect(document.documentElement.dataset.theme).toBe('dossier');
  });

  it('сохраняет значение и читает его после «перезагрузки»', () => {
    useSettings().setShuffle(false);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({
      shuffleOptions: false,
      quizLength: 'all',
      theme: 'dossier',
    });
    reloadSettings();
    expect(useSettings().settings.value.shuffleOptions).toBe(false);
  });

  it('длина теста по умолчанию «все», сохраняется и читается после «перезагрузки»', () => {
    expect(useSettings().settings.value.quizLength).toBe('all');
    useSettings().setQuizLength('random');
    reloadSettings();
    expect(useSettings().settings.value.quizLength).toBe('random');
    expect(useSettings().settings.value.shuffleOptions).toBe(true);
  });

  it('тема сохраняется, применяется к DOM и восстанавливается после «перезагрузки»', () => {
    useSettings().setTheme('notion');
    expect(useSettings().settings.value.theme).toBe('notion');
    expect(document.documentElement.dataset.theme).toBe('notion');
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).theme).toBe('notion');

    reloadSettings();
    expect(useSettings().settings.value.theme).toBe('notion');
    expect(document.documentElement.dataset.theme).toBe('notion');

    useSettings().setTheme('owl');
    expect(document.documentElement.dataset.theme).toBe('owl');
  });

  it('старая запись без quizLength и theme читается корректно', () => {
    expect(parseSettings('{"shuffleOptions":false}')).toEqual({
      shuffleOptions: false,
      quizLength: 'all',
      theme: 'dossier',
    });
    expect(parseSettings('{"quizLength":"bad","theme":"unknown"}')).toEqual({
      shuffleOptions: true,
      quizLength: 'all',
      theme: 'dossier',
    });
  });

  it('повреждённые данные — значения по умолчанию', () => {
    localStorage.setItem(SETTINGS_KEY, '{not json');
    reloadSettings();
    expect(useSettings().settings.value.shuffleOptions).toBe(true);
    expect(useSettings().settings.value.theme).toBe('dossier');
  });

  it('данные неверного вида — значения по умолчанию', () => {
    const defaults = { shuffleOptions: true, quizLength: 'all', theme: 'dossier' };
    expect(parseSettings('{"shuffleOptions":"no"}')).toEqual(defaults);
    expect(parseSettings('null')).toEqual(defaults);
    expect(parseSettings(null)).toEqual(defaults);
  });
});

describe('ThemeSelector', () => {
  it('отображает 3 кнопки тем и переключает тему по клику', async () => {
    const wrapper = mount(ThemeSelector);
    const buttons = wrapper.findAll('.theme-selector__btn');
    expect(buttons).toHaveLength(3);

    // По умолчанию активен dossier
    expect(buttons[0].classes()).toContain('is-active');
    expect(buttons[0].attributes('aria-pressed')).toBe('true');

    // Клик по Notion (вторая кнопка)
    await buttons[1].trigger('click');
    expect(useSettings().settings.value.theme).toBe('notion');
    expect(document.documentElement.dataset.theme).toBe('notion');
    expect(buttons[1].classes()).toContain('is-active');

    // Клик по OWL (третья кнопка)
    await buttons[2].trigger('click');
    expect(useSettings().settings.value.theme).toBe('owl');
    expect(document.documentElement.dataset.theme).toBe('owl');
    expect(buttons[2].classes()).toContain('is-active');
  });
});
