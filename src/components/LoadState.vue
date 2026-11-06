<script setup lang="ts">
import type { LoadError } from '../composables/useContent';
import NotFoundView from '../views/NotFoundView.vue';

defineProps<{ loading: boolean; error: LoadError | null }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <p v-if="loading" class="muted" role="status">Загрузка…</p>
  <NotFoundView v-else-if="error === 'notfound'" />
  <div v-else-if="error === 'error'" class="notice notice--error" role="alert">
    <p>Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.</p>
    <button type="button" class="btn" @click="$emit('retry')">Повторить</button>
  </div>
  <slot v-else />
</template>
