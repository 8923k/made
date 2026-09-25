import { createRouter, createWebHashHistory } from 'vue-router'
import Component from '@/components/Component.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Component
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
