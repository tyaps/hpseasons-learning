<script setup lang="ts">
import { useSettings, type ThemeId } from '../composables/useSettings';

const { settings, setTheme } = useSettings();

const themes: { id: ThemeId; label: string; fullTitle: string; icon: string }[] = [
  { id: 'dossier', label: 'Архив', fullTitle: 'Архив Министерства Магии', icon: '📁' },
  { id: 'notion', label: 'База знаний', fullTitle: 'Минималистичная база знаний', icon: '📝' },
  { id: 'owl', label: 'Экзамен С.О.В.', fullTitle: 'Экзаменационный лист С.О.В.', icon: '📜' },
];
</script>

<template>
  <div class="theme-selector" role="group" aria-label="Тема оформления">
    <button
      v-for="t in themes"
      :key="t.id"
      type="button"
      class="theme-selector__btn"
      :class="{ 'is-active': settings.theme === t.id }"
      :aria-pressed="settings.theme === t.id"
      :title="t.fullTitle"
      @click="setTheme(t.id)"
    >
      <span class="theme-selector__icon" aria-hidden="true">{{ t.icon }}</span>
      <span class="theme-selector__label">{{ t.label }}</span>
    </button>
  </div>
</template>
