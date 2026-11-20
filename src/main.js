import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import AuthPage from './pages/AuthPage.vue';
import LibraryPage from './pages/LibraryPage.vue';
import { useAuthStore } from './stores/auth';
import './style.css';

const pinia = createPinia();
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: AuthPage },
    { path: '/register', component: AuthPage },
    { path: '/books', component: LibraryPage, meta: { requiresAuth: true } },
    { path: '/category/:categoryId', component: LibraryPage, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
});
router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);
  if (!auth.checked) await auth.restoreSession();
  if (to.meta.requiresAuth && !auth.user) return { path: '/login', query: { redirect: to.fullPath } };
  if (auth.user && ['/login', '/register'].includes(to.path)) return '/books';
});
router.afterEach((to) => {
  document.title = `${to.path === '/register' ? 'Create an account' : to.path === '/login' ? 'Welcome back' : 'Your bookshelf'} · TabBook`;
});
createApp(App).use(pinia).use(router).mount('#app');
