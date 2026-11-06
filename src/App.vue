<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useJson } from './composables/useContent';
import { useCreatureSelection } from './composables/useCreatureSelection';
import type { RuleSummary } from './types/content';
import { quizReturnKey } from './composables/useQuizReturn';

// Удаляем результаты, сохранённые прежними версиями приложения.
try { localStorage.removeItem('hps-progress-v1'); } catch { /* Хранилище недоступно. */ }

const route = useRoute();
const { data: rules } = useJson<RuleSummary[]>('rules.json');
const { excluded } = useCreatureSelection();
const monsters = computed(() => rules.value?.filter(r => r.section === 'Монстробук'));
const selectedCount = computed(() => monsters.value?.filter(m => !excluded.value.includes(m.id)).length ?? 0);
const returnToQuiz = ref<string | null>(null);
const returnToSettings = ref(false);
const showSettingsReturn = computed(() => returnToSettings.value && route.name === 'monster');
const showQuizReturn = computed(() => returnToQuiz.value !== null && ['rule', 'monster'].includes(String(route.name)));

provide(quizReturnKey, (event) => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
  if (route.name === 'topic' || route.name === 'all') returnToQuiz.value = route.fullPath;
});

watch(() => route.fullPath, () => {
  if (!['rule', 'monster'].includes(String(route.name))) returnToQuiz.value = null;
});

watch(() => route.name, (to, from) => {
  if (from === 'creature-settings' && to === 'monster') returnToSettings.value = true;
  else if (to !== 'monster') returnToSettings.value = false;
});
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <RouterLink class="site-header__logo" to="/">HP Seasons: тренажёр правил</RouterLink>
      <div class="site-header__controls">
        <nav class="site-nav" aria-label="Основная навигация" @click="returnToQuiz = null; returnToSettings = false">
          <RouterLink to="/" exact-active-class="is-active">Тесты</RouterLink>
          <RouterLink to="/rules" active-class="is-active">Справочник</RouterLink>
          <RouterLink to="/monsters" active-class="is-active">Монстробук</RouterLink>
          <RouterLink to="/creature-settings" active-class="is-active">Существа в тестах<span v-if="monsters"> ({{ selectedCount }} из {{ monsters.length }})</span></RouterLink>
        </nav>
      </div>
    </div>
  </header>
  <main class="container" :class="{ 'has-quiz-return': showQuizReturn || showSettingsReturn }">
    <RouterView v-slot="{ Component, route: viewRoute }">
      <KeepAlive include="QuizView" :max="1">
        <component :is="Component" :key="viewRoute.path" />
      </KeepAlive>
    </RouterView>
  </main>
  <RouterLink v-if="showSettingsReturn" to="/creature-settings" class="btn quiz-return" data-test="settings-return">
    ← Назад в настройки
  </RouterLink>
  <RouterLink v-if="showQuizReturn && returnToQuiz" :to="returnToQuiz" class="btn quiz-return" data-test="quiz-return">
    ← Назад в тест
  </RouterLink>
</template>
