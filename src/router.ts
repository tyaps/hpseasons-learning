import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import RulesIndexView from './views/RulesIndexView.vue';
import RuleView from './views/RuleView.vue';
import NotFoundView from './views/NotFoundView.vue';

export const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/topic/:id', name: 'topic', component: () => import('./views/QuizView.vue') },
  { path: '/all', name: 'all', component: () => import('./views/QuizView.vue') },
  { path: '/rules', name: 'rules', component: RulesIndexView },
  { path: '/rules/:id', name: 'rule', component: RuleView },
  { path: '/creature-settings', name: 'creature-settings', component: () => import('./views/CreatureSettingsView.vue') },
  { path: '/monsters', name: 'monsters', component: () => import('./views/MonstersView.vue') },
  { path: '/monsters/:id', name: 'monster', component: RuleView },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
];

export function createAppRouter(history = createWebHashHistory()) {
  return createRouter({
    history,
    routes,
    scrollBehavior(to, from, saved) {
      if (saved) return saved;
      // Прокрутку к якорю внутри статьи выполняет RuleView после загрузки данных.
      if (to.path === from.path) return false;
      return { top: 0 };
    },
  });
}

export default createAppRouter();
