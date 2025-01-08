<template>
  <div class="chat-input-container">
    <div class="input-wrapper" :class="{ 'expanded': isExpanded }">
      <textarea 
        v-model="message"
        placeholder="请输入您想问的问题"
        class="input-area"
        :style="{ 
          height: textareaHeight + 'px',
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? 'auto' : 'none'
        }"
        @input="onInput"
        ref="textarea"
      ></textarea>
      <button 
        class="send-button"
        :class="{ 
          'collapsed': !isExpanded,
          'disabled': isLoading || (!message.trim() && isExpanded)
        }"
        @click="handleClick"
      >
        <i class="fas fa-search" :style="{ marginRight: isExpanded ? '8px' : '0' }"></i>
        <span v-if="isExpanded">发送</span>
      </button>
    </div>
    <div class="input-tip" v-if="isExpanded">
      服务生成的所有内容均由人工智能模型生成，其准确性和完整性无法保证，不代表本平台立场和观点。
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send'])

const message = ref('')
const isExpanded = ref(false)
const textareaHeight = ref(40)
const textarea = ref(null)

const handleClick = () => {
  if (!isExpanded.value) {
    isExpanded.value = true
    nextTick(() => {
      textarea.value?.focus()
    })
  } else if (message.value.trim() && !props.isLoading) {
    emit('send', message.value)
    message.value = ''
    textareaHeight.value = 40
  }
}

const onInput = (e) => {
  const target = e.target
  target.style.height = '40px'
  target.style.height = `${target.scrollHeight}px`
  textareaHeight.value = Math.min(Math.max(target.scrollHeight, 40), 160)
}
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  padding: 16px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.3s ease;
  overflow: hidden;
  width: 120px;
  margin-left: auto;
}

.input-wrapper.expanded {
  width: 100%;
}

.input-area {
  flex: 1;
  border: none;
  padding: 8px 12px;
  font-size: 14px;
  resize: none;
  transition: all 0.3s ease;
  background: transparent;
}

.input-area:focus {
  outline: none;
}

.send-button {
  padding: 8px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  min-width: 120px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.2);
}

.send-button.collapsed {
  min-width: 120px;
  width: 120px;
}

.send-button:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
  background: linear-gradient(135deg, #1677ff, #1677ff);
}

.send-button.disabled {
  background: linear-gradient(135deg, #d9d9d9, #f0f0f0);
  cursor: not-allowed;
  box-shadow: none;
}

.input-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  line-height: 1.5;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.input-wrapper.expanded + .input-tip {
  opacity: 1;
  transform: translateY(0);
}
</style>