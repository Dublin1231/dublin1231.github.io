<template>
  <div class="model-selector">
    <el-dropdown @command="handleModelSelect">
      <el-button type="primary">
        选择模型
        <el-icon class="el-icon--right"><arrow-down /></el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="我的体验" name="experience">
              <div class="model-list">
                <div
                  v-for="model in modelStore.availableModels"
                  :key="model.id"
                  class="model-item"
                  :class="{ active: model.id === modelStore.currentModel.id }"
                  @click="handleModelSelect(model.id)"
                >
                  <div class="model-icon">
                    <img :src="model.icon || getDefaultIcon(model.type)" />
                  </div>
                  <div class="model-info">
                    <h3>{{ model.name }}</h3>
                    <p>{{ model.description }}</p>
                    <div class="model-meta">
                      <span>{{ model.size }}</span>
                      <span>{{ model.updateTime }} 更新</span>
                    </div>
                  </div>
                  <el-button
                    v-if="model.id === modelStore.currentModel.id"
                    type="success"
                    size="small"
                    disabled
                  >已选择</el-button>
                  <el-button
                    v-else
                    type="primary"
                    size="small"
                  >选择</el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useModelStore } from '../store/modelStore';
import { ArrowDown } from '@element-plus/icons-vue';

const modelStore = useModelStore();
const activeTab = ref('experience');

const handleModelSelect = (modelId: string) => {
  modelStore.setCurrentModel(modelId);
};

const getDefaultIcon = (type: string) => {
  // 返回不同类型模型的默认图标
  return type === 'ollama' ? '/icons/ollama.png' : '/icons/default.png';
};
</script>

<style scoped>
.model-selector {
  /* 添加样式 */
}

.model-list {
  padding: 12px;
}

.model-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.model-item:hover {
  background-color: #f5f7fa;
}

.model-item.active {
  background-color: #ecf5ff;
}

.model-icon {
  width: 40px;
  height: 40px;
  margin-right: 12px;
}

.model-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.model-info {
  flex: 1;
}

.model-info h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.model-info p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #666;
}

.model-meta {
  font-size: 12px;
  color: #999;
}

.model-meta span {
  margin-right: 12px;
}
</style> 