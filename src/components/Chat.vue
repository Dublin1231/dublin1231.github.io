<template>
  <div class="chat-container">
    <div class="chat-header">
      <model-selector />
      <div class="current-model">
        当前模型: {{ modelStore.currentModel.name }}
      </div>
    </div>
    
    <!-- 聊天内容区域 -->
    <div class="chat-messages">
      <!-- 消息列表 -->
    </div>
    
    <!-- 输入区域 -->
    <div class="chat-input">
      <el-input
        v-model="messageInput"
        type="textarea"
        :rows="3"
        placeholder="请输入消息..."
        @keyup.enter.ctrl="handleSendMessage"
      />
      <el-button
        type="primary"
        :loading="loading"
        @click="handleSendMessage"
      >发送</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useModelStore } from '../store/modelStore';
import { useOllama } from '../hooks/useOllama';
import ModelSelector from './ModelSelector.vue';

const modelStore = useModelStore();
const { loading, error, generateResponse, streamResponse } = useOllama();
const messageInput = ref('');

const handleSendMessage = async () => {
  if (!messageInput.value.trim()) return;
  
  const message = messageInput.value;
  messageInput.value = '';
  
  if (modelStore.currentModel.type === 'ollama') {
    // 使用 Ollama 处理消息
    await streamResponse(message, (chunk) => {
      // 处理响应...
      console.log(chunk);
    });
  } else {
    // 处理其他类型的模型
    // ...
  }
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 12px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-model {
  font-size: 14px;
  color: #666;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chat-input {
  padding: 12px;
  border-top: 1px solid #eee;
}
</style> 