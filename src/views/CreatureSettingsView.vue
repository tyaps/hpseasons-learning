<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import LoadState from '../components/LoadState.vue';
import { useJson } from '../composables/useContent';
import { useCreatureSelection } from '../composables/useCreatureSelection';
import type { RuleSummary } from '../types/content';
const { data, error, loading, retry } = useJson<RuleSummary[]>('rules.json');
const { excluded, setEnabled } = useCreatureSelection();
const monsters = computed(() => (data.value ?? []).filter(r => r.section === 'Монстробук'));
const selectedCount = computed(() => monsters.value.filter(m => !excluded.value.includes(m.id)).length);
</script>

<template>
  <section>
    <h1>Существа в тестах<span v-if="data"> ({{ selectedCount }} из {{ monsters.length }})</span></h1>
    <p>Оставьте отмеченными существ, которых хотите изучать. Выбор сохраняется и применяется при запуске новой попытки во всех режимах теста.</p>
    <p class="muted">Вопросы остальных тем доступны при любом выборе.</p>
    <LoadState :loading="loading" :error="error" @retry="retry">
      <div class="btn-row">
        <button class="btn btn--secondary" @click="monsters.forEach(m => setEnabled(m.id, true))">Выбрать всех</button>
        <button class="btn btn--secondary" @click="monsters.forEach(m => setEnabled(m.id, false))">Снять все</button>
      </div>
      <ul class="creature-selection">
        <li v-for="monster in monsters" :key="monster.id">
          <label><input type="checkbox" :checked="!excluded.includes(monster.id)"
            @change="setEnabled(monster.id, ($event.target as HTMLInputElement).checked)" /> {{ monster.title }}</label>
          <RouterLink :to="`/monsters/${monster.id}`" :aria-label="`Карточка: ${monster.title}`">В монстробуке ↗</RouterLink>
        </li>
      </ul>
      <RouterLink class="btn" to="/">К тестам</RouterLink>
    </LoadState>
  </section>
</template>
