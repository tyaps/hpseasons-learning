<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import LoadState from '../components/LoadState.vue';
import ShuffleToggle from '../components/ShuffleToggle.vue';
import { useJson } from '../composables/useContent';
import { useProgress } from '../composables/useProgress';
import { ALL_SCOPE, RANDOM_QUIZ_SIZE } from '../domain/quiz';
import type { TopicSummary } from '../types/content';

const { data: topics, error, loading, retry } = useJson<TopicSummary[]>('topics.json');
const progress = useProgress();

const totalQuestions = computed(() => topics.value?.reduce((sum, t) => sum + t.questionCount, 0) ?? 0);

function bestText(key: string): string {
  const p = progress.get(key);
  return p ? `Лучший результат: ${p.best} из ${p.total}` : 'Ещё не проходили';
}

function randomText(key: string): string | null {
  const p = progress.get(`${key}:random`);
  return p ? `Случайные ${RANDOM_QUIZ_SIZE}: ${p.best} из ${p.total}` : null;
}

function resetProgress(): void {
  if (window.confirm('Сбросить сохранённые результаты по всем темам?')) progress.reset();
}
</script>

<template>
  <section>
    <h1>Темы</h1>
    <p class="muted">Выберите тему и проверьте, как вы знаете правила.</p>
    <ShuffleToggle />
    <LoadState :loading="loading" :error="error" @retry="retry">
      <ul class="card-list">
        <li>
          <RouterLink class="card card--all" to="/all" data-test="all-card">
            <h2 class="card__title">Тест по всем темам</h2>
            <p class="card__text">Вопросы из всех тем вперемешку.</p>
            <p class="card__meta">Вопросов: {{ totalQuestions }}</p>
            <p class="card__meta" data-test="best-all">{{ bestText(ALL_SCOPE) }}</p>
            <p v-if="randomText(ALL_SCOPE)" class="card__meta" data-test="best-all-random">
              {{ randomText(ALL_SCOPE) }}
            </p>
          </RouterLink>
        </li>
        <li v-for="topic in topics" :key="topic.id">
          <RouterLink class="card" :to="`/topic/${topic.id}`">
            <h2 class="card__title">{{ topic.title }}</h2>
            <p class="card__text">{{ topic.description }}</p>
            <p class="card__meta">Вопросов: {{ topic.questionCount }}</p>
            <p class="card__meta" data-test="best">{{ bestText(topic.id) }}</p>
            <p v-if="randomText(topic.id)" class="card__meta" data-test="best-random">
              {{ randomText(topic.id) }}
            </p>
          </RouterLink>
        </li>
      </ul>
      <div class="btn-row">
        <button type="button" class="btn btn--secondary" data-test="reset" @click="resetProgress">
          Сбросить прогресс
        </button>
      </div>
    </LoadState>
  </section>
</template>
