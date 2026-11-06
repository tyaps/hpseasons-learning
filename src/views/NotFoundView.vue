<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <section class="notice">
    <h1>Не найдено</h1>
    <p>Такой страницы нет. Возможно, ссылка устарела.</p>
    <RouterLink class="btn" to="/">К темам</RouterLink>
  </section>
</template>
