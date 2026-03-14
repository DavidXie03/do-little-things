import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/todos',
      name: 'todos',
      component: () => import('../views/PendingView.vue'),
    },
  ],
})

export default router
