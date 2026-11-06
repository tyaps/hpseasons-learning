<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LoadState from '../components/LoadState.vue';
import { useJson } from '../composables/useContent';
import type { RuleSummary } from '../types/content';

const { data: rules, error, loading, retry } = useJson<RuleSummary[]>('rules.json');
const search = ref('');
const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
const monsters = computed(() => (rules.value ?? []).filter((r) => r.section === 'Монстробук'));
const filtered = computed(() => monsters.value.filter((r) => normalize(r.title).includes(normalize(search.value))));
</script>

<template>
  <section>
    <h1>Монстробук</h1>
    <p class="muted">Полные карточки существ: описание, изображения, атаки и уязвимости.</p>
    <LoadState :loading="loading" :error="error" @retry="retry">
      <label class="monster-search">
        Найти существо
        <input v-model="search" type="search" placeholder="Название существа" data-test="monster-search" />
      </label>
      <p class="muted" data-test="monster-count">Найдено: {{ filtered.length }} из {{ monsters.length }}</p>
      <ul class="monster-list">
        <li v-for="monster in filtered" :key="monster.id">
          <RouterLink class="card" :to="`/monsters/${monster.id}`">{{ monster.title }}</RouterLink>
        </li>
      </ul>
      <p v-if="!filtered.length">Существа с таким названием не найдены.</p>
    </LoadState>
  </section>
</template>
