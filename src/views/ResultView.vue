<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { correctAnswerText, isCorrect } from '../domain/grading';
import { ruleLocation } from '../domain/links';
import type { QuizItem } from '../domain/quiz';
import type { UserAnswer } from '../types/content';

const props = defineProps<{ items: QuizItem[]; answers: UserAnswer[] }>();
defineEmits<{ restart: [] }>();

const results = computed(() =>
  props.items.map((item, i) => ({
    key: item.key,
    question: item.question,
    correct: props.answers[i] ? isCorrect(item.question, props.answers[i]) : false,
  })),
);
const total = computed(() => results.value.length);
const score = computed(() => results.value.filter((r) => r.correct).length);
const percent = computed(() => (total.value ? Math.round((score.value / total.value) * 100) : 0));
const mistakes = computed(() => results.value.filter((r) => !r.correct));
</script>

<template>
  <section class="notice" aria-label="Результат">
    <h2>Результат</h2>
    <p class="score" data-test="score">{{ score }} из {{ total }}</p>
    <p class="muted" data-test="percent">{{ percent }}%</p>

    <template v-if="mistakes.length">
      <h3>Ошибки</h3>
      <ul class="mistakes" data-test="mistakes">
        <li v-for="m in mistakes" :key="m.key">
          <p><strong>{{ m.question.prompt }}</strong></p>
          <p>Правильный ответ: {{ correctAnswerText(m.question) }}</p>
          <p v-if="m.question.rule">
            <RouterLink :to="ruleLocation(m.question.rule)">Читать правило в справочнике</RouterLink>
          </p>
        </li>
      </ul>
    </template>
    <p v-else>Все ответы верные. Отличный результат!</p>

    <div class="btn-row">
      <button type="button" class="btn" data-test="restart" @click="$emit('restart')">Пройти заново</button>
      <RouterLink class="btn btn--secondary" to="/">К темам</RouterLink>
    </div>
  </section>
</template>
