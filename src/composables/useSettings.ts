import { ref } from 'vue';
import type { QuizLength } from '../domain/quiz';

export const SETTINGS_KEY = 'hps-settings-v1';

export type ThemeId = 'dossier' | 'notion' | 'owl';

export type Settings = {
  shuffleOptions: boolean;
  quizLength: QuizLength;
  theme: ThemeId;
};

const DEFAULTS: Settings = {
  shuffleOptions: true,
  quizLength: 'all',
  theme: 'dossier',
};

function applyThemeToDom(theme: ThemeId): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = theme;
  }
}

export function parseSettings(raw: string | null): Settings {
  const result: Settings = { ...DEFAULTS };
  if (!raw) return result;
  try {
    const data = JSON.parse(raw) as Partial<Settings> | null;
    if (data && typeof data === 'object') {
      if (typeof data.shuffleOptions === 'boolean') result.shuffleOptions = data.shuffleOptions;
      if (data.quizLength === 'random' || data.quizLength === 'all' || data.quizLength === 'shuffled') result.quizLength = data.quizLength;
      if (data.theme === 'dossier' || data.theme === 'notion' || data.theme === 'owl') result.theme = data.theme;
    }
  } catch {
    // повреждённые данные — используем значения по умолчанию
  }
  return result;
}

function read(): Settings {
  try {
    const s = parseSettings(localStorage.getItem(SETTINGS_KEY));
    applyThemeToDom(s.theme);
    return s;
  } catch {
    applyThemeToDom(DEFAULTS.theme);
    return { ...DEFAULTS };
  }
}

const settings = ref<Settings>(read());

/** Перечитывает настройки из `localStorage` (после перезагрузки страницы, в тестах). */
export function reloadSettings(): void {
  settings.value = read();
}

function save(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value));
  } catch {
    // хранилище недоступно — настройка живёт до перезагрузки
  }
}

export function useSettings() {
  function setShuffle(value: boolean): void {
    settings.value = { ...settings.value, shuffleOptions: value };
    save();
  }

  function setQuizLength(value: QuizLength): void {
    settings.value = { ...settings.value, quizLength: value };
    save();
  }

  function setTheme(value: ThemeId): void {
    settings.value = { ...settings.value, theme: value };
    applyThemeToDom(value);
    save();
  }

  return { settings, setShuffle, setQuizLength, setTheme };
}
