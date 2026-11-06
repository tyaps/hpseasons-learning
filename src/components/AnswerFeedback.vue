<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { correctAnswerText } from '../domain/grading';
import { ruleLocation } from '../domain/links';
import type { Question } from '../types/content';

defineProps<{ question: Question; correct: boolean; study?: boolean }>();
</script>

<template>
  <div class="feedback" :class="study || correct ? 'feedback--ok' : 'feedback--bad'" role="status">
    <p v-if="!study" class="feedback__verdict">{{ correct ? 'Верно!' : 'Неверно' }}</p>
    <p v-if="!study && !correct">
      Правильный ответ: <strong data-test="correct-answer">{{ correctAnswerText(question) }}</strong>
    </p>
    <p data-test="explanation">{{ question.explanation }}</p>
    <p v-if="question.rule || question.source" class="feedback__links">
      <RouterLink v-if="question.rule" :to="ruleLocation(question.rule)">Читать правило в справочнике</RouterLink>
      <template v-if="question.rule && question.source"> · </template>
      <a v-if="question.source" :href="question.source" target="_blank" rel="noopener noreferrer">Первоисточник</a>
    </p>
  </div>
</template>
