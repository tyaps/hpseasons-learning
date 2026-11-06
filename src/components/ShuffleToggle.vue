<script setup lang="ts">
import { useSettings } from '../composables/useSettings';

const { settings, setShuffle } = useSettings();

function onChange(event: Event): void {
  setShuffle((event.target as HTMLInputElement).checked);
}
</script>

<template>
  <label class="toggle">
    <input type="checkbox" :checked="settings.shuffleOptions" @change="onChange" />
    <span>Перемешивать варианты ответов</span>
  </label>
</template>
