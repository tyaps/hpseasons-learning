import { beforeEach, describe, expect, it } from 'vitest';
import { parseSettings, reloadSettings, SETTINGS_KEY, useSettings } from '../src/composables/useSettings';

beforeEach(() => {
  localStorage.clear();
  reloadSettings();
});

describe('useSettings', () => {
  it('по умолчанию перемешивание включено', () => {
    expect(useSettings().settings.value.shuffleOptions).toBe(true);
  });

  it('сохраняет значение и читает его после «перезагрузки»', () => {
    useSettings().setShuffle(false);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ shuffleOptions: false, quizLength: 'all' });
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

  it('старая запись без quizLength читается корректно', () => {
    expect(parseSettings('{"shuffleOptions":false}')).toEqual({ shuffleOptions: false, quizLength: 'all' });
    expect(parseSettings('{"quizLength":"bad"}')).toEqual({ shuffleOptions: true, quizLength: 'all' });
  });

  it('повреждённые данные — значения по умолчанию', () => {
    localStorage.setItem(SETTINGS_KEY, '{not json');
    reloadSettings();
    expect(useSettings().settings.value.shuffleOptions).toBe(true);
  });

  it('данные неверного вида — значения по умолчанию', () => {
    const defaults = { shuffleOptions: true, quizLength: 'all' };
    expect(parseSettings('{"shuffleOptions":"no"}')).toEqual(defaults);
    expect(parseSettings('null')).toEqual(defaults);
    expect(parseSettings(null)).toEqual(defaults);
  });
});
