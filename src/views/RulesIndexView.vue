<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import LoadState from '../components/LoadState.vue';
import { useJson } from '../composables/useContent';
import type { RuleSummary } from '../types/content';

const { data: rules, error, loading, retry } = useJson<RuleSummary[]>('rules.json');

const sections = computed(() => {
  const groups = new Map<string, RuleSummary[]>();
  for (const rule of rules.value ?? []) {
    const list = groups.get(rule.section) ?? [];
    list.push(rule);
    groups.set(rule.section, list);
  }
  return [...groups.entries()].map(([title, items]) => ({ title, items }));
});
</script>

<template>
  <section>
    <h1>Справочник правил</h1>
    <LoadState :loading="loading" :error="error" @retry="retry">
      <section v-for="section in sections" :key="section.title" class="rule-section">
        <h2>{{ section.title }}</h2>
        <ul class="link-list">
          <li v-for="rule in section.items" :key="rule.id">
            <RouterLink :to="`/rules/${rule.id}`">{{ rule.title }}</RouterLink>
          </li>
        </ul>
      </section>
    </LoadState>
  </section>
</template>
