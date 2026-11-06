<script setup lang="ts">
import { dataUrl } from '../composables/useContent';
import { RouterLink } from 'vue-router';
import { correctAnswerText } from '../domain/grading';
import { ruleLocation } from '../domain/links';
import type { Question } from '../types/content';
import { useQuizReturn } from '../composables/useQuizReturn';

const rememberQuizReturn = useQuizReturn();

defineProps<{ question: Question; correct: boolean; study?: boolean; reaction?: string | null; portrait?: string | null }>();
</script>

<template>
  <div class="feedback" :class="study || correct ? 'feedback--ok' : 'feedback--bad'" role="status">
    <div class="feedback__content">
      <!-- Атмосферный штамп для темы «Архив Министерства» -->
      <div class="feedback__dossier-stamp" aria-hidden="true">
        <span v-if="study" class="stamp stamp--study">СПРАВКА</span>
        <span v-else-if="correct" class="stamp stamp--ok">ОДОБРЕНО</span>
        <span v-else class="stamp stamp--bad">АННУЛИРОВАНО</span>
      </div>

      <!-- Заголовок для темы «Экзамен С.О.В.» -->
      <div class="feedback__owl-header" aria-hidden="true">
        <span class="feedback__owl-title">Пометка экзаменатора:</span>
        <span v-if="!study" class="feedback__owl-grade" :class="correct ? 'feedback__owl-grade--ok' : 'feedback__owl-grade--bad'">
          {{ correct ? '«Превосходно!»' : '«Ошибка!»' }}
        </span>
      </div>

      <!-- Заголовок для темы «База знаний Notion» -->
      <div class="feedback__notion-header" aria-hidden="true">
        <span class="feedback__notion-icon">{{ study ? '📖' : correct ? '✅' : '💡' }}</span>
        <span class="feedback__notion-title">{{ study ? 'Материал для изучения' : correct ? 'Верный ответ' : 'Разбор вопроса' }}</span>
      </div>

      <p v-if="!study" class="feedback__verdict">{{ correct ? 'Верно!' : 'Неверно' }}</p>
      <p v-if="!study && !correct" class="feedback__correct-row">
        Правильный ответ: <strong data-test="correct-answer">{{ correctAnswerText(question) }}</strong>
      </p>
      <p class="feedback__explanation" data-test="explanation">{{ question.explanation }}</p>
      <p v-if="question.rule || question.source" class="feedback__links">
        <RouterLink v-if="question.rule" :to="ruleLocation(question.rule)" @click.capture="rememberQuizReturn">Читать правило в справочнике</RouterLink>
        <template v-if="question.rule && question.source"> · </template>
        <a v-if="question.source" :href="question.source" target="_blank" rel="noopener noreferrer">Первоисточник</a>
      </p>
    </div>
    <aside v-if="reaction && !study" class="comic-reaction" data-test="answer-reaction" aria-label="Реплика персонажа">
      <img :src="dataUrl(portrait ?? 'assets/characters/red_hat.jpg')" alt="" class="comic-reaction__portrait" />
      <p class="comic-reaction__bubble">{{ reaction }}</p>
    </aside>
  </div>
</template>
