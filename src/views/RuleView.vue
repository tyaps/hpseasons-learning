<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import LoadState from '../components/LoadState.vue';
import { useJson } from '../composables/useContent';
import type { Rule } from '../types/content';
import { ruleLocation } from '../domain/links';

const route = useRoute();
const ruleId = computed(() => String(route.params.id));
const { data: rule, error, loading, retry } = useJson<Rule>(() => `rules/${ruleId.value}.json`);
const isMonster = computed(() => rule.value?.section === 'Монстробук' || route.name === 'monster');

const article = ref<HTMLElement | null>(null);

async function scrollToAnchor(): Promise<void> {
  await nextTick();
  const anchor = route.query.anchor;
  if (typeof anchor !== 'string' || !article.value) return;
  const target = [...article.value.querySelectorAll('[id]')].find((el) => el.id === anchor);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

watch([rule, () => route.query.anchor], () => {
  if (rule.value) void scrollToAnchor();
}, { flush: 'post' });
</script>

<template>
  <section>
    <p class="breadcrumbs"><RouterLink :to="isMonster ? '/monsters' : '/rules'">{{ isMonster ? '← Монстробук' : '← Справочник' }}</RouterLink></p>
    <LoadState :loading="loading" :error="error" @retry="retry">
      <article v-if="rule" ref="article" class="rule">
        <p class="muted">{{ rule.section }}</p>
        <h1>{{ rule.title }}</h1>
        <nav v-if="rule.anchors.length" class="toc" aria-label="Содержание">
          <ul class="link-list">
            <li v-for="a in rule.anchors" :key="a.id">
              <RouterLink :to="ruleLocation(`${rule.id}#${a.id}`)">{{ a.title }}</RouterLink>
            </li>
          </ul>
        </nav>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="rule__body" v-html="rule.html"></div>
      </article>
    </LoadState>
  </section>
</template>
