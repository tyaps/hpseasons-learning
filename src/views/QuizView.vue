<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AnswerFeedback from '../components/AnswerFeedback.vue';
import LoadState from '../components/LoadState.vue';
import QuestionRenderer from '../components/questions/QuestionRenderer.vue';
import ShuffleToggle from '../components/ShuffleToggle.vue';
import { useQuizTopics, useJson } from '../composables/useContent';
import { useCreatureSelection, filterCreatureTopics } from '../composables/useCreatureSelection';
import { useAnswerReaction } from '../composables/useAnswerReaction';
import { useSettings } from '../composables/useSettings';
import { correctAnswer, isCorrect } from '../domain/grading';
import { RANDOM_QUIZ_SIZE, buildQuiz, parseQuizRange, type QuizItem, type QuizRange } from '../domain/quiz';
import type { UserAnswer, AnswerReactions } from '../types/content';
import ResultView from './ResultView.vue';

const route = useRoute();
// The cached attempt belongs to its original route, even while an article is open.
const quizRouteName = route.name;
const quizRouteId = String(route.params.id);
const { settings, setQuizLength } = useSettings();

const isAll = computed(() => quizRouteName === 'all');
const topicId = computed(() => (isAll.value ? null : quizRouteId));
const { data: rawTopics, error, loading, retry } = useQuizTopics(topicId);

const { excluded } = useCreatureSelection();
const topics = computed(() => rawTopics.value ? filterCreatureTopics(rawTopics.value, excluded.value) : undefined);
const title = computed(() => (isAll.value ? 'Тест по всем темам' : (topics.value?.[0]?.title ?? '')));
const poolSize = computed(() => topics.value?.reduce((sum, t) => sum + t.questions.length, 0) ?? 0);

const { data: reactions } = useJson<AnswerReactions>('reactions.json');
const { reaction, portrait, showReaction, clearReaction, resetReactionStreak } = useAnswerReaction(reactions);

const started = ref(false);
const finished = ref(false);
const studyMode = ref(false);
const activeStudy = ref(false);
const items = ref<QuizItem[]>([]);
const index = ref(0);
const answers = ref<UserAnswer[]>([]);
const attempt = ref(0);
const rangeFrom = ref('1');
const rangeTo = ref('');
const activeRange = ref<QuizRange>();
const rangeValidation = computed(() => parseQuizRange(rangeFrom.value, rangeTo.value, poolSize.value));
const rangeError = computed(() => settings.value.quizLength === 'all' ? rangeValidation.value.error : null);

watch(poolSize, (size) => {
  rangeFrom.value = '1';
  rangeTo.value = String(size);
}, { immediate: true });

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

function start(): void {
  clearReaction();
  resetReactionStreak();
  if (!topics.value || !poolSize.value || rangeError.value) return;
  const range = settings.value.quizLength === 'all' ? rangeValidation.value.range ?? undefined : undefined;
  items.value = buildQuiz(topics.value, { length: settings.value.quizLength, mixed: isAll.value, range });
  activeRange.value = range;
  activeStudy.value = studyMode.value;
  index.value = 0;
  answers.value = [];
  finished.value = false;
  started.value = true;
  attempt.value++;
}

function backToStart(): void {
  clearReaction();
  resetReactionStreak();
  started.value = false;
  finished.value = false;
}

function onAnswer(answer: UserAnswer): void {
  if (activeStudy.value || answers.value[index.value]) return;
  answers.value[index.value] = answer;
  showReaction(isCorrect(question.value!, answer));
}

function next(): void {
  if (!currentAnswer.value) return;
  clearReaction();
  if (isLast.value) {
    finished.value = true;
  } else {
    index.value++;
  }
}

function previous(): void {
  clearReaction();
  if (index.value > 0) index.value--;
}

watch(rawTopics, backToStart);
</script>

<template>
  <section>
    <p class="breadcrumbs"><RouterLink to="/">← Все темы</RouterLink></p>
    <LoadState :loading="loading" :error="error" @retry="retry">
      <template v-if="topics">
        <h1>{{ title }}</h1>

        <div v-if="!started" class="notice start-screen" data-test="start-screen">
          <fieldset class="start-screen__group">
            <legend>Вопросы и порядок</legend>
            <p class="muted">Всего вопросов: {{ poolSize }}</p>
            <p><RouterLink to="/creature-settings">Выбрать существ для тестов</RouterLink></p>
            <p v-if="!poolSize" role="status">Нет вопросов для выбранных существ. Измените выбор в настройках.</p>
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
            <div class="quiz-ordered">
              <label class="radio">
                <input
                  type="radio"
                  name="quiz-length"
                  data-test="length-all"
                  :checked="settings.quizLength === 'all'"
                  @change="setQuizLength('all')"
                />
                <span>Все вопросы (в одинаковом порядке)</span>
              </label>
              <div v-if="settings.quizLength === 'all'" class="quiz-range">
                <label>
                  с
                  <input v-model="rangeFrom" type="text" inputmode="numeric" pattern="[0-9]+" aria-label="Первый вопрос"
                    data-test="range-from" :aria-invalid="!!rangeError" :aria-describedby="rangeError ? 'quiz-range-error' : undefined" />
                </label>
                <label>
                  по
                  <input v-model="rangeTo" type="text" inputmode="numeric" pattern="[0-9]+" aria-label="Последний вопрос"
                    data-test="range-to" :aria-invalid="!!rangeError" :aria-describedby="rangeError ? 'quiz-range-error' : undefined" />
                </label>
                <p v-if="rangeError" id="quiz-range-error" class="quiz-range__error" role="alert">{{ rangeError }}</p>
              </div>
            </div>
            <label class="radio">
              <input
                type="radio"
                name="quiz-length"
                data-test="length-shuffled"
                :checked="settings.quizLength === 'shuffled'"
                @change="setQuizLength('shuffled')"
              />
              <span>Все вопросы (в случайном порядке)</span>
            </label>
          </fieldset>

          <label class="toggle">
            <input v-model="studyMode" type="checkbox" data-test="study-toggle" />
            <span>Режим обучения: правильные ответы проставлены сразу</span>
          </label>
          <ShuffleToggle />

          <div class="btn-row">
            <button type="button" class="btn" data-test="start" :disabled="!poolSize || !!rangeError" @click="start">Начать</button>
          </div>
        </div>

        <template v-else-if="finished && activeStudy">
          <section class="notice" data-test="study-done">
            <h2>Режим обучения пройден</h2>
            <p>Просмотрено вопросов: {{ total }}.</p>
            <div class="btn-row">
              <button type="button" class="btn" data-test="restart" @click="backToStart">Пройти заново</button>
              <RouterLink class="btn btn--secondary" to="/">К темам</RouterLink>
            </div>
          </section>
        </template>

        <ResultView v-else-if="finished" :items="items" :answers="answers" @restart="backToStart" />

        <template v-else-if="question && item">
          <div
            class="quiz-progress"
            role="progressbar"
            :aria-valuenow="index + 1"
            :aria-valuemin="1"
            :aria-valuemax="total"
            :aria-label="`Прогресс теста: вопрос ${index + 1} из ${total}`"
          >
            <div class="quiz-progress__bar" :style="{ width: `${((index + 1) / total) * 100}%` }" />
          </div>
          <div class="quiz-meta">
            <span data-test="question-position">Вопрос {{ index + 1 }} из {{ total }}</span>
            <span v-if="activeRange && total < poolSize" class="muted" data-test="original-number">№ {{ activeRange.from + index }} в полном списке</span>
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
            <AnswerFeedback :question="question" :correct="currentCorrect" :study="activeStudy" :reaction="reaction" :portrait="portrait" />
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
