import { ref } from 'vue';
import type { QuizLength } from '../domain/quiz';

export const SETTINGS_KEY = 'hps-settings-v1';

export type Settings = {
  shuffleOptions: boolean;
  quizLength: QuizLength;
};

const DEFAULTS: Settings = {
  shuffleOptions: true,
  quizLength: 'all',
};

export function parseSettings(raw: string | null): Settings {
  const result: Settings = { ...DEFAULTS };
  if (!raw) return result;
  try {
    const data = JSON.parse(raw) as Partial<Settings> | null;
    if (data && typeof data === 'object') {
      if (typeof data.shuffleOptions === 'boolean') result.shuffleOptions = data.shuffleOptions;
      if (data.quizLength === 'random' || data.quizLength === 'all' || data.quizLength === 'shuffled') result.quizLength = data.quizLength;
    }
  } catch {
    // повреждённые данные — используем значения по умолчанию
  }
  return result;
}

function read(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
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

  return { settings, setShuffle, setQuizLength };
}
