import { beforeEach, describe, expect, it } from 'vitest';
import { parseSettings, reloadSettings, SETTINGS_KEY, useSettings } from '../src/composables/useSettings';

beforeEach(() => { localStorage.clear(); reloadSettings(); });

describe('useSettings', () => {
  it('по умолчанию перемешивание включено, длина «все»', () => {
    expect(useSettings().settings.value).toEqual({ shuffleOptions: true, quizLength: 'all' });
  });
  it('сохраняет перемешивание и читает после перезагрузки', () => {
    useSettings().setShuffle(false);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ shuffleOptions: false, quizLength: 'all' });
    reloadSettings();
    expect(useSettings().settings.value.shuffleOptions).toBe(false);
  });
  it('сохраняет длину теста и не меняет перемешивание', () => {
    useSettings().setQuizLength('random'); reloadSettings();
    expect(useSettings().settings.value).toEqual({ shuffleOptions: true, quizLength: 'random' });
  });
  it.each(['dossier', 'notion', 'owl'])('игнорирует сохранённую тему %s, сохраняя остальные настройки', theme => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme, shuffleOptions: false, quizLength: 'shuffled' }));
    reloadSettings();
    expect(useSettings().settings.value).toEqual({ shuffleOptions: false, quizLength: 'shuffled' });
    useSettings().setShuffle(true);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).not.toHaveProperty('theme');
  });
  it.each(['{broken', 'null', '[]', '{"shuffleOptions":"no","quizLength":"bad"}', null])
    ('использует значения по умолчанию для некорректных данных %s', raw => {
      expect(parseSettings(raw)).toEqual({ shuffleOptions: true, quizLength: 'all' });
    });
  it('читает старую запись без длины теста', () => {
    expect(parseSettings('{"shuffleOptions":false}')).toEqual({ shuffleOptions: false, quizLength: 'all' });
  });
});
