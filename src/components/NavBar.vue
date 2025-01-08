<template>
  <nav class="nav-bar">
    <div class="nav-left">
      <div class="nav-tabs">
        <router-link to="/" class="nav-tab" active-class="active">首页</router-link>
        <router-link to="/chat" class="nav-tab" active-class="active">对话</router-link>
      </div>
    </div>
    <div class="nav-right">
      <router-link to="/cache-monitor" class="icon-btn" title="缓存监控">
        <i class="fas fa-database"></i>
        <span>缓存监控</span>
      </router-link>
      <button class="icon-btn" title="历史记录" @click="showHistory = true">
        <i class="fas fa-history"></i>
        <span>历史记录</span>
      </button>
      <button class="icon-btn" title="设置" @click="showSettings = true">
        <i class="fas fa-cog"></i>
        <span>设置</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'

const showHistory = ref(false)
const showSettings = ref(false)
</script>

<style scoped>
.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-tabs {
  display: flex;
  gap: 24px;
}

.nav-tab {
  color: #666;
  text-decoration: none;
  padding: 8px 0;
  position: relative;
}

.nav-tab.active {
  color: #1677ff;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #1677ff;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
}

.icon-btn:hover {
  color: #1677ff;
}

.icon-btn i {
  font-size: 16px;
}
</style> 