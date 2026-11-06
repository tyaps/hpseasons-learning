<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import LoadState from '../components/LoadState.vue';
import ShuffleToggle from '../components/ShuffleToggle.vue';
import { useJson } from '../composables/useContent';
import { useCreatureSelection } from '../composables/useCreatureSelection';
import type { TopicSummary } from '../types/content';

const { data: rawTopics, error, loading, retry } = useJson<TopicSummary[]>('topics.json');
const { excluded } = useCreatureSelection();
const topics = computed(() => rawTopics.value?.map(t => ({ ...t, questionCount: t.questionCount - excluded.value.reduce((sum, id) => sum + (t.creatureQuestionCounts?.[id] ?? 0), 0) })));

const totalQuestions = computed(() => topics.value?.reduce((sum, t) => sum + t.questionCount, 0) ?? 0);
</script>

<template>
  <section>
    <h1>Темы</h1>
    <p class="muted">Выберите тему и проверьте, как вы знаете правила.</p>
    <p><RouterLink to="/creature-settings">Выбрать существ для тестов</RouterLink></p>
    <ShuffleToggle />
    <LoadState :loading="loading" :error="error" @retry="retry">
      <ul class="card-list">
        <li>
          <RouterLink class="card card--all" to="/all" data-test="all-card">
            <h2 class="card__title">Тест по всем темам</h2>
            <p class="card__text">Вопросы из всех тем в выбранном порядке.</p>
            <p class="card__meta">Вопросов: {{ totalQuestions }}</p>
          </RouterLink>
        </li>
        <li v-for="topic in topics" :key="topic.id">
          <RouterLink class="card" :to="`/topic/${topic.id}`">
            <h2 class="card__title">{{ topic.title }}</h2>
            <p class="card__text">{{ topic.description }}</p>
            <p class="card__meta">Вопросов: {{ topic.questionCount }}</p>
          </RouterLink>
        </li>
      </ul>
    </LoadState>
  </section>
</template>
