import { createRouter, createWebHistory } from 'vue-router'
import CacheMonitor from '../components/CacheMonitor.vue'

const routes = [
  // ... 其他路由配置
  {
    path: '/cache-monitor',
    name: 'CacheMonitor',
    component: CacheMonitor,
    meta: { 
      requiresAuth: true,
      title: '缓存监控'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || '项目提示词系统'
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    const apiKey = localStorage.getItem('apiKey')
    if (!apiKey) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  }
  next()
})

export default router 