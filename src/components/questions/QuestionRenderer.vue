<script setup lang="ts">
import { useSettings } from '../../composables/useSettings';
import { selectionHint } from '../../domain/hints';
import { shuffle } from '../../domain/shuffle';
import type { Option, Question, UserAnswer } from '../../types/content';
import MultipleChoice from './MultipleChoice.vue';
import SingleChoice from './SingleChoice.vue';
import { dataUrl } from '../../composables/useContent';

const props = defineProps<{
  question: Question;
  locked: boolean;
  answer?: UserAnswer | null;
}>();

defineEmits<{ answer: [answer: UserAnswer] }>();

const { settings } = useSettings();

// Порядок вариантов выбирается один раз при показе вопроса и дальше не меняется
// (в том числе при показе разбора). Смена настройки действует со следующего вопроса.
const q = props.question;
const options: Option[] = settings.value.shuffleOptions ? shuffle(q.options) : [...q.options];
</script>

<template>
  <div class="question">
    <p class="question__prompt">{{ question.prompt }}</p>
    <img v-if="question.image" class="question__image" :src="dataUrl(question.image.src)" :alt="question.image.alt" />
    <p class="question__hint" data-test="hint">{{ selectionHint(question) }}</p>
    <SingleChoice
      v-if="question.type === 'single'"
      :options="options"
      :locked="locked"
      :answer="answer"
      @answer="$emit('answer', $event)"
    />
    <MultipleChoice v-else :options="options" :locked="locked" :answer="answer" @answer="$emit('answer', $event)" />
  </div>
</template>
