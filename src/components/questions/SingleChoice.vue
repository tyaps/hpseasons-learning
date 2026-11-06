<script setup lang="ts">
import type { Option, UserAnswer } from '../../types/content';

const props = defineProps<{
  options: Option[];
  locked: boolean;
  answer?: UserAnswer | null;
}>();

const emit = defineEmits<{ answer: [answer: UserAnswer] }>();

function selectedId(): string | undefined {
  return props.answer?.kind === 'single' ? props.answer.optionId : undefined;
}

function choose(option: Option): void {
  if (props.locked) return;
  emit('answer', { kind: 'single', optionId: option.id });
}
</script>

<template>
  <div class="options" role="group">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="option-btn"
      :class="{
        'is-correct': locked && option.correct,
        'is-wrong': locked && selectedId() === option.id && !option.correct,
      }"
      :data-option-id="option.id"
      :disabled="locked"
      @click="choose(option)"
    >
      {{ option.text }}
    </button>
  </div>
</template>
