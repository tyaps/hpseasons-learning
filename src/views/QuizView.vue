<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AnswerFeedback from '../components/AnswerFeedback.vue';
import LoadState from '../components/LoadState.vue';
import QuestionRenderer from '../components/questions/QuestionRenderer.vue';
import ShuffleToggle from '../components/ShuffleToggle.vue';
import { useQuizTopics } from '../composables/useContent';
import { useProgress } from '../composables/useProgress';
import { useSettings } from '../composables/useSettings';
import { correctAnswer, isCorrect } from '../domain/grading';
import { ALL_SCOPE, RANDOM_QUIZ_SIZE, buildQuiz, progressKey, type QuizItem } from '../domain/quiz';
import type { UserAnswer } from '../types/content';
import ResultView from './ResultView.vue';

const route = useRoute();
const progress = useProgress();
const { settings, setQuizLength } = useSettings();

const isAll = computed(() => route.name === 'all');
const topicId = computed(() => (isAll.value ? null : String(route.params.id)));
const { data: topics, error, loading, retry } = useQuizTopics(topicId);

const title = computed(() => (isAll.value ? 'Тест по всем темам' : (topics.value?.[0]?.title ?? '')));
const poolSize = computed(() => topics.value?.reduce((sum, t) => sum + t.questions.length, 0) ?? 0);
const scope = computed(() => (isAll.value ? ALL_SCOPE : String(route.params.id)));

const started = ref(false);
const finished = ref(false);
const studyMode = ref(false);
const activeStudy = ref(false);
const activeKey = ref('');
const items = ref<QuizItem[]>([]);
const index = ref(0);
const answers = ref<UserAnswer[]>([]);
const attempt = ref(0);

const total = computed(() => items.value.length);
const item = computed(() => items.value[index.value]);
const question = computed(() => item.value?.question);
const currentAnswer = computed<UserAnswer | null>(() => {
  if (!question.value) return null;
  return activeStudy.value ? correctAnswer(question.value) : (answers.value[index.value] ?? null);
});
const currentCorrect = computed(() =>
  question.value && currentAnswer.value ? isCorrect(question.value, currentAnswer.value) : false,
);
const isLast = computed(() => index.value + 1 >= total.value);
const score = computed(
  () => items.value.filter((it, i) => answers.value[i] && isCorrect(it.question, answers.value[i])).length,
);

function start(): void {
  if (!topics.value) return;
  items.value = buildQuiz(topics.value, { length: settings.value.quizLength, mixed: isAll.value });
  activeStudy.value = studyMode.value;
  activeKey.value = progressKey(scope.value, settings.value.quizLength, poolSize.value);
  index.value = 0;
  answers.value = [];
  finished.value = false;
  started.value = true;
  attempt.value++;
}

function backToStart(): void {
  started.value = false;
  finished.value = false;
}

function onAnswer(answer: UserAnswer): void {
  if (activeStudy.value || answers.value[index.value]) return;
  answers.value[index.value] = answer;
}

function next(): void {
  if (!currentAnswer.value) return;
  if (isLast.value) {
    finished.value = true;
    if (!activeStudy.value) progress.record(activeKey.value, score.value, total.value);
  } else {
    index.value++;
  }
}

function previous(): void {
  if (index.value > 0) index.value--;
}

watch(topics, backToStart);
</script>

<template>
  <section>
    <p class="breadcrumbs"><RouterLink to="/">← Все темы</RouterLink></p>
    <LoadState :loading="loading" :error="error" @retry="retry">
      <template v-if="topics">
        <h1>{{ title }}</h1>

        <div v-if="!started" class="notice start-screen" data-test="start-screen">
          <fieldset class="start-screen__group">
            <legend>Сколько вопросов</legend>
            <label class="radio">
              <input
                type="radio"
                name="quiz-length"
                data-test="length-random"
                :checked="settings.quizLength === 'random'"
                @change="setQuizLength('random')"
              />
              <span>
                {{ RANDOM_QUIZ_SIZE }} случайных вопросов
                <small v-if="poolSize <= RANDOM_QUIZ_SIZE" class="muted">
                  (всего {{ poolSize }} — будут все, вперемешку)
                </small>
              </span>
            </label>
            <label class="radio">
              <input
                type="radio"
                name="quiz-length"
                data-test="length-all"
                :checked="settings.quizLength === 'all'"
                @change="setQuizLength('all')"
              />
              <span>Все вопросы ({{ poolSize }})</span>
            </label>
          </fieldset>

          <label class="toggle">
            <input v-model="studyMode" type="checkbox" data-test="study-toggle" />
            <span>Режим обучения: правильные ответы проставлены сразу, результат не засчитывается</span>
          </label>
          <ShuffleToggle />

          <div class="btn-row">
            <button type="button" class="btn" data-test="start" @click="start">Начать</button>
          </div>
        </div>

        <template v-else-if="finished && activeStudy">
          <section class="notice" data-test="study-done">
            <h2>Режим обучения пройден</h2>
            <p>Просмотрено вопросов: {{ total }}. Результат не засчитывается.</p>
            <div class="btn-row">
              <button type="button" class="btn" data-test="restart" @click="backToStart">Пройти заново</button>
              <RouterLink class="btn btn--secondary" to="/">К темам</RouterLink>
            </div>
          </section>
        </template>

        <ResultView v-else-if="finished" :items="items" :answers="answers" @restart="backToStart" />

        <template v-else-if="question && item">
          <div class="quiz-meta">
            <span data-test="progress">Вопрос {{ index + 1 }} из {{ total }}</span>
            <span v-if="activeStudy" class="badge" data-test="study-badge">Режим обучения</span>
            <ShuffleToggle />
          </div>
          <p v-if="isAll" class="muted" data-test="topic-label">Тема: {{ item.topicTitle }}</p>
          <KeepAlive>
            <QuestionRenderer
              :key="`${attempt}-${index}`"
              :question="question"
              :locked="currentAnswer !== null"
              :answer="currentAnswer"
              @answer="onAnswer"
            />
          </KeepAlive>
          <template v-if="currentAnswer">
            <AnswerFeedback :question="question" :correct="currentCorrect" :study="activeStudy" />
          </template>
          <div class="btn-row">
            <button v-if="index > 0" type="button" class="btn btn--secondary" data-test="previous" @click="previous">
              Назад
            </button>
            <button v-if="currentAnswer" type="button" class="btn" data-test="next" @click="next">
              {{ isLast ? (activeStudy ? 'Завершить' : 'Показать результат') : 'Далее' }}
            </button>
          </div>
        </template>
      </template>
    </LoadState>
  </section>
</template>
