<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Option, UserAnswer } from '../../types/content';

const props = defineProps<{
  options: Option[];
  locked: boolean;
  answer?: UserAnswer | null;
}>();

const emit = defineEmits<{ answer: [answer: UserAnswer] }>();

const required = computed(() => props.options.filter((o) => o.correct).length);
const selected = ref<string[]>(props.answer?.kind === 'multiple' ? [...props.answer.optionIds] : []);
const canSubmit = computed(() => !props.locked && selected.value.length === required.value);

function toggle(option: Option): void {
  if (props.locked) return;
  const index = selected.value.indexOf(option.id);
  if (index >= 0) selected.value.splice(index, 1);
  else selected.value.push(option.id);
}

function submit(): void {
  if (!canSubmit.value) return;
  emit('answer', { kind: 'multiple', optionIds: [...selected.value] });
}
</script>

<template>
  <div>
    <div class="options" role="group">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="option-btn"
        :class="{
          'is-correct': locked && option.correct,
          'is-wrong': locked && selected.includes(option.id) && !option.correct,
        }"
        :data-option-id="option.id"
        :aria-pressed="selected.includes(option.id)"
        :disabled="locked"
        @click="toggle(option)"
      >
        {{ option.text }}
      </button>
    </div>
    <p class="counter">Выбрано {{ selected.length }} из {{ required }}</p>
    <div v-if="!locked" class="btn-row">
      <button type="button" class="btn" data-test="submit" :disabled="!canSubmit" @click="submit">
        Ответить
      </button>
    </div>
  </div>
</template>
