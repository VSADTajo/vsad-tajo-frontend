import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import MapView from '@/views/MapView.vue'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: LoginView,
      name: 'login',
      meta: { public: true },
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', component: MapView },
        { path: 'predicciones', component: MapView },
        { path: 'capas', component: MapView },
        { path: 'avisos', component: MapView },
        { path: 'simulaciones', component: MapView },
        { path: 'informes', component: MapView },
        { path: 'mapasbase', component: MapView },
        { path: 'ajustes', component: MapView },
      ],
    },
  ],
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('auth') === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router
