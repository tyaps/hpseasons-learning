<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <RouterLink class="site-header__logo" to="/">HP Seasons: тренажёр правил</RouterLink>
      <nav class="site-nav" aria-label="Основная навигация">
        <RouterLink to="/" exact-active-class="is-active">Тесты</RouterLink>
        <RouterLink to="/rules" active-class="is-active">Справочник</RouterLink>
      </nav>
    </div>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>
