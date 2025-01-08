<template>
  <div>
    <!-- 添加Font Awesome CDN -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    
  <div class="app-container">
    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-left">
        <div class="nav-tabs">
          <a href="#" class="nav-tab active">文本对话</a>
          <a href="#" class="nav-tab">文本调试</a>
        </div>
      </div>
      <div class="nav-right">
          <button class="icon-btn" title="历史记录" @click="showHistory = true">
            <i class="fas fa-history"></i>
            <span>历史记录</span>
          </button>
          <button 
            class="icon-btn" 
            title="清除聊天记录" 
            @click="clearCurrentChat" 
            v-if="selectedModel && currentMessages.length > 0"
          >
            <i class="fas fa-trash-alt"></i>
            <span>清除聊天</span>
          </button>
          <button class="icon-btn" title="自定义" @click="showCustomize = true">
            <i class="fas fa-paint-brush"></i>
            <span>自定义</span>
          </button>
          <button class="icon-btn" title="设置" @click="showSettings = true">
          <i class="fas fa-cog"></i>
            <span>设置</span>
        </button>
        <button class="select-model-btn" @click="showModelSelector = true">
          <i class="fas fa-plus"></i>
          选择模型
        </button>
      </div>
    </nav>

    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 模型选择标签页 -->
      <div class="model-tabs" v-if="showModelSelector">
        <div 
          v-for="(tab, index) in modelTabs" 
          :key="index"
          :class="['tab', { active: activeTab === index }]"
          @click="activeTab = index"
        >
          <i :class="getTabIcon(index)"></i>
          {{ tab }}
        </div>
      </div>

      <!-- 模型列表 -->
      <div class="model-section" v-if="showModelSelector">
        <div class="model-grid">
          <div 
            v-for="model in filteredModels" 
            :key="model.id"
            class="model-card"
            :class="{ active: selectedModel === model.id }"
            :data-model="model.id"
            @click="selectModel(model.id)"
          >
            <div class="model-header">
                <div class="model-icon">
                  <i :class="getModelIcon(model.id)"></i>
                </div>
              <div class="model-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-tokens">{{ model.tokens }}</div>
              </div>
              <div class="model-select">
                <i class="fas fa-check-circle" v-if="selectedModel === model.id"></i>
              </div>
            </div>
            <div class="model-desc">{{ model.description }}</div>
            <div class="model-meta">
              <span class="model-update">{{ model.updateTime }}</span>
              <span class="model-select-btn" v-if="selectedModel === model.id">已选择</span>
              <span class="model-select-btn select" v-else>选择</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话区域 -->
      <div class="chat-section" v-if="selectedModel">
        <div class="chat-container" @scroll="handleScroll" ref="messagesContainer">
          <div class="chat-messages">
            <div 
                v-for="(msg, index) in currentMessages" 
              :key="index"
              :class="['message', msg.role]"
            >
              <div class="message-header">
                  <div class="avatar-icon" :class="msg.role === 'assistant' ? getModelIconClass() : ''">
                    <i :class="msg.role === 'assistant' ? getModelIcon(selectedModel) : 'fas fa-user'"></i>
                  </div>
                <span class="name">{{ msg.role === 'assistant' ? selectedModelName : '我' }}</span>
                <div class="actions">
                  <button class="action-btn" @click="copyMessage(msg)">
                    <i class="fas fa-copy"></i>
                  </button>
                  <button class="action-btn" @click="editMessage(msg)" v-if="msg.role === 'user'">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
              </div>
              <div class="message-content" v-html="formatMessage(msg.content)"></div>
            </div>
            
            <!-- 返回顶部按钮移动到这里 -->
            <div 
              class="back-to-top" 
              v-show="showBackToTop"
              @click="scrollToTop"
            >
              <span class="arrow">⌃</span>
            </div>
            <div 
              class="back-to-bottom" 
              v-show="showBackToTop"
              @click="scrollToBottom"
            >
              <span class="arrow arrow-down">⌃</span>
            </div>
          </div>
          
          <!-- 新的输入框区域 -->
          <div class="ModelTextArea__textarea-wrap--OYPVC" :class="{ 'expanded-wrapper': isSearchExpanded }">
            <div class="ModelTextArea__file-textarea-wrap--LG7uH">
              <div 
                class="search-container"
                :class="{ 'expanded': isSearchExpanded }"
              >
                <div class="search-content" v-show="isSearchExpanded">
                  <textarea 
                    v-model="prompt"
                    placeholder="请输入您想问的问题" 
                    class="efm_ant-input"
                    @input="autoResize"
                  ></textarea>
                </div>
                <button 
                  class="search-btn"
                  :class="{'disabled': isLoading || (!prompt.trim() && isSearchExpanded)}"
                  @click="handleSearchClick"
                >
                  <i class="fas fa-magnifying-glass" :style="{ marginRight: isSearchExpanded ? '8px' : '0' }"></i>
                  <span v-if="isSearchExpanded">搜索</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示选择模型 -->
      <div class="select-hint" v-else>
        <i class="fas fa-robot"></i>
          <p>选择模型开始体验</p>
        </div>
      </div>
    </div>

    <!-- 历史记录弹窗 -->
    <div class="history-modal" v-if="showHistory" @click.self="showHistory = false">
      <div class="history-content">
        <div class="history-header">
          <h3>历史记录</h3>
          <button class="icon-btn" @click="showHistory = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="history-tabs">
          <div 
            v-for="model in models" 
            :key="model.id"
            :class="['history-tab', { active: historyTab === model.id }]"
            :data-model="model.id"
            @click="historyTab = model.id"
          >
            <i :class="getModelIcon(model.id)"></i>
            {{ model.name }}
          </div>
        </div>
        <div class="history-list">
          <div v-if="modelMessages[historyTab]?.length" class="history-messages">
            <div 
              v-for="(msg, index) in modelMessages[historyTab]" 
              :key="index"
              class="history-message"
            >
              <div class="message-time">
                <i class="fas" :class="msg.role === 'assistant' ? getModelIcon(historyTab) : 'fa-user'"></i>
                {{ formatTime(msg.timestamp) }}
              </div>
              <div :class="['message-content', msg.role]">
                {{ msg.content }}
                <div class="message-actions">
                  <button class="message-action-btn" @click="copyMessage(msg)">
                    <i class="fas fa-copy"></i>
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="history-empty">
            <i class="fas fa-history"></i>
            <p>暂无历史记录</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加自定义模态框 -->
    <div class="settings-modal" v-if="showCustomize" @click.self="showCustomize = false">
      <div class="settings-content">
        <div class="settings-header">
          <h3>自定义</h3>
          <button class="icon-btn" @click="showCustomize = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="settings-body">
          <!-- 背景设置 -->
          <div class="settings-section">
            <h4>背景设置</h4>
            <div class="settings-options">
              <div class="setting-item">
                <label>背景类型</label>
                <select v-model="settings.background.type">
                  <option value="color">纯色</option>
                  <option value="gradient">渐变色</option>
                  <option value="image">图片</option>
                </select>
              </div>
              
              <!-- 纯色背景设置 -->
              <div class="setting-item" v-if="settings.background.type === 'color'">
                <label>背景颜色</label>
                <input type="color" v-model="settings.background.color">
              </div>
              
              <!-- 渐变背景设置 -->
              <div v-if="settings.background.type === 'gradient'">
                <div class="setting-item">
                  <label>渐变起始色</label>
                  <input type="color" v-model="settings.background.gradientStart">
                </div>
                <div class="setting-item">
                  <label>渐变结束色</label>
                  <input type="color" v-model="settings.background.gradientEnd">
                </div>
                <div class="setting-item">
                  <label>渐变角度</label>
                  <input type="range" min="0" max="360" v-model="settings.background.gradientAngle">
                </div>
              </div>
              
              <!-- 图片背景设置 -->
              <div class="setting-item" v-if="settings.background.type === 'image'">
                <label>背景图片URL</label>
                <input type="text" v-model="settings.background.imageUrl" placeholder="输入图片URL">
              </div>
            </div>
          </div>
          
          <!-- 聊天气泡设置 -->
          <div class="settings-section">
            <h4>聊天气泡设置</h4>
            <div class="settings-options">
              <!-- 用户消息设置 -->
              <div class="bubble-settings">
                <h5>用户消息样式</h5>
                <div class="setting-item">
                  <label>背景颜色</label>
                  <input type="color" v-model="settings.userBubble.backgroundColor">
                </div>
                <div class="setting-item">
                  <label>文字颜色</label>
                  <input type="color" v-model="settings.userBubble.textColor">
                </div>
                <div class="setting-item">
                  <label>圆角大小</label>
                  <input type="range" min="0" max="20" v-model="settings.userBubble.borderRadius">
                </div>
              </div>
              
              <!-- 助手消息设置 -->
              <div class="bubble-settings">
                <h5>助手消息样式</h5>
                <div class="setting-item">
                  <label>背景颜色</label>
                  <input type="color" v-model="settings.assistantBubble.backgroundColor">
                </div>
                <div class="setting-item">
                  <label>文字颜色</label>
                  <input type="color" v-model="settings.assistantBubble.textColor">
                </div>
                <div class="setting-item">
                  <label>圆角大小</label>
                  <input type="range" min="0" max="20" v-model="settings.assistantBubble.borderRadius">
                </div>
              </div>
            </div>
          </div>
          
          <!-- 预览区域 -->
          <div class="settings-preview">
            <h4>预览</h4>
            <div class="preview-messages">
              <div class="preview-message user">
                <div class="preview-bubble" :style="userBubbleStyle">
                  这是用户消息预览
                </div>
              </div>
              <div class="preview-message assistant">
                <div class="preview-bubble" :style="assistantBubbleStyle">
                  这是助手消息预览
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="btn-secondary" @click="resetCustomize">重置</button>
          <button class="btn-primary" @click="saveCustomize">保存</button>
        </div>
      </div>
    </div>

    <!-- 修改设置模态框内容 -->
    <div class="settings-modal" v-if="showSettings" @click.self="showSettings = false">
      <div class="settings-content">
        <div class="settings-header">
          <h3>设置</h3>
          <button class="icon-btn" @click="showSettings = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="settings-body">
          <!-- API设置 -->
          <div class="settings-section">
            <h4>API配置</h4>
            <div class="settings-options">
              <div class="setting-item">
                <label>API Key</label>
                <input 
                  type="password" 
                  v-model="apiSettings.apiKey"
                  placeholder="请输入API Key" 
                  class="settings-input"
                >
              </div>
              <div class="setting-item">
                <label>应用ID</label>
                <input 
                  type="text" 
                  v-model="apiSettings.appId"
                  placeholder="请输入应用ID" 
                  class="settings-input"
                >
              </div>
            </div>
          </div>
          
          <!-- 模型配置 -->
          <div class="settings-section">
            <h4>模型配置</h4>
            <div class="settings-options">
              <div class="setting-item">
                <label>默认模型</label>
                <select v-model="apiSettings.defaultModel" class="settings-input">
                  <option value="qwen-long">通义千问-Long</option>
                  <option value="qwen-plus-1220">通义千问-Plus-1220</option>
                  <option value="qwen-max">通义千问-Max</option>
                  <option value="qwen-lv-max">通义千问-LV-Max</option>
                </select>
              </div>
              <div class="setting-item">
                <label>最大长度</label>
                <input 
                  type="number" 
                  v-model="apiSettings.maxLength"
                  placeholder="请输入最大长度" 
                  class="settings-input"
                >
              </div>
              <div class="setting-item">
                <label>温度</label>
                <input 
                  type="range" 
                  v-model="apiSettings.temperature"
                  min="0" 
                  max="1" 
                  step="0.1"
                  class="settings-input"
                >
                <span>{{apiSettings.temperature}}</span>
              </div>
            </div>
          </div>

          <!-- 模型提示词配置 -->
          <div class="settings-section">
            <h4>模型提示词</h4>
            <div class="settings-options">
              <div class="setting-item">
                <label>通义千问-Long</label>
                <textarea 
                  v-model="modelPrompts['qwen-long']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
              <div class="setting-item">
                <label>通义千问-Plus-1220</label>
                <textarea 
                  v-model="modelPrompts['qwen-plus-1220']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
              <div class="setting-item">
                <label>通义千问-Max</label>
                <textarea 
                  v-model="modelPrompts['qwen-max']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
              <div class="setting-item">
                <label>通义千问-LV-Max</label>
                <textarea 
                  v-model="modelPrompts['qwen-lv-max']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
              <div class="setting-item">
                <label>Ollama-Mistral</label>
                <textarea 
                  v-model="modelPrompts['ollama-mistral']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
              <div class="setting-item">
                <label>Ollama-Llama2</label>
                <textarea 
                  v-model="modelPrompts['ollama-llama2']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
              <div class="setting-item">
                <label>Ollama-CodeLlama</label>
                <textarea 
                  v-model="modelPrompts['ollama-codellama']"
                  class="settings-input prompt-input"
                  placeholder="请输入模型提示词"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="btn-secondary" @click="resetApiSettings">重置</button>
          <button class="btn-primary" @click="saveApiSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import axios from 'axios'

const prompt = ref('')
const isLoading = ref(false)
const isSearchExpanded = ref(false)
const selectedModel = ref(null)
const modelMessages = ref({
  'qwen-long': [],
  'qwen-plus': [],
  'qwen-72b': [],
  'ollama-mistral': [],
  'ollama-llama2': [],
  'ollama-zephyr': [],
  'ollama-qwen': []
})
const editingMessage = ref(null)
const retryCount = ref(0)
const MAX_RETRIES = 3

// Default avatar and model icon
const userIcon = '/icons/user-avatar.png'

// Model list
const models = [
  {
    id: 'qwen-long',
    name: '通义千问-Long',
    description: '通义千问2是新升级的超规模语言模型，中文、文等多语言输入。基于qwen-long的功能增强开发，记忆长度更长，性能更优。',
    tokens: '32K',
    icon: '/icons/qwen-long.png',
    updateTime: '2024-10-15更新'
  },
  {
    id: 'qwen-plus-1220',
    name: '通义千问-Plus-1220',
    description: '通义千问Plus-1220是稳定性和质量兼具的模型。',
    tokens: '128K',
    icon: '/icons/qwen-plus.png',
    updateTime: '2024-10-15更新'
  },
  {
    id: 'qwen-max',
    name: '通义千问-Max',
    description: '通义千问Max是最新的高性能模型，具有更强的理解和生成能力。',
    tokens: '128K',
    icon: '/icons/qwen-plus.png',
    updateTime: '2024-10-15更新'
  },
  {
    id: 'qwen-lv-max',
    name: '通义千问-LV-Max',
    description: '通义千问LV-Max是大视野版本，支持更长的上下文理解。',
    tokens: '128K',
    icon: '/icons/qwen-plus.png',
    updateTime: '2024-10-15更新'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Google最新的AI模型，具有快速推理和强大的多模态能力。',
    tokens: '128K',
    icon: '/icons/gemini.png',
    updateTime: '2024-03-20更新'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Google最新的AI模型，具有更快的推理速度和更强大的多模态理解能力，支持代码、图像和文本的深度理解。',
    tokens: '128K',
    icon: '/icons/gemini.png',
    updateTime: '2024-03-21更新'
  },
  {
    id: 'ollama-mistral',
    name: 'Mistral',
    description: 'Mistral AI开发的高性能开源模型，支持多语言，推理性能优秀。',
    tokens: '128K',
    icon: '/icons/ollama.png',
    updateTime: '2024-03-20更新'
  },
  {
    id: 'ollama-llama2',
    name: 'Llama2',
    description: 'Meta开发的新一代开源大语言模型，性能强大，支持多语言。',
    tokens: '128K',
    icon: '/icons/ollama.png',
    updateTime: '2024-03-20更新'
  },
  {
    id: 'ollama-zephyr',
    name: 'Zephyr',
    description: 'Zephyr是一个基于Mistral 7B的微调模型，在对话和指令遵循方面表现优异。',
    tokens: '128K',
    icon: '/icons/ollama.png',
    updateTime: '2024-03-20更新'
  },
  {
    id: 'ollama-qwen',
    name: 'Qwen 2.5',
    description: '通义千问2.5的3B规模本地版本，轻量级但性能优秀的中文大语言模型。',
    tokens: '128K',
    icon: '/icons/ollama.png',
    updateTime: '2024-03-20更新'
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4-Flash',
    description: '智谱AI最新的高性能模型，具有快速推理和强大的多模态理解能力，支持代码、图像和文本的深度理解。',
    tokens: '128K',
    icon: '/icons/glm.png',
    updateTime: '2024-03-21更新'
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    description: 'DeepSeek最新的大语言模型，具有强大的多语言理解和生成能力，支持代码、文本的深度理解。',
    tokens: '128K',
    icon: '/icons/deepseek.png',
    updateTime: '2024-03-21更新'
  }
]

// Calculated properties
const selectedModelName = computed(() => {
  const model = models.find(m => m.id === selectedModel.value)
  return model ? model.name : ''
})

const selectedModelIcon = computed(() => {
  const model = models.find(m => m.id === selectedModel.value)
  return model ? model.icon : ''
})

const currentMessages = computed(() => {
  return selectedModel.value ? modelMessages.value[selectedModel.value] : []
})

// Add API call function
const API_URL = 'http://localhost:3456'

// Save message to server
async function saveMessageToServer(message) {
  try {
    const response = await axios.post(`${API_URL}/api/messages`, {
      modelId: selectedModel.value,
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString()
    })
    console.log('消息已保存到服务器:', response.data)
  } catch (error) {
    console.error('保存消息失败:', error)
  }
}

// Load messages from server
async function loadMessagesFromServer(modelId) {
  try {
    const response = await axios.get(`${API_URL}/api/messages/${modelId}`)
    modelMessages.value[modelId] = response.data.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }))
    console.log(`已加载 ${modelId} 的消息:`, response.data)
  } catch (error) {
    console.error('加载消息失败:', error)
    modelMessages.value[modelId] = []
  }
}

// Clear messages from server
async function clearMessagesFromServer(modelId) {
  try {
    await axios.delete(`${API_URL}/api/messages/${modelId}`)
    modelMessages.value[modelId] = []
    console.log(`已清除 ${modelId} 的消息`)
  } catch (error) {
    console.error('清除消息失败:', error)
  }
}

// Method
async function selectModel(modelId) {
  selectedModel.value = modelId
  await loadMessagesFromServer(modelId)
  showModelSelector.value = false // 选择后隐藏模型选择界面
  
  // 等待DOM更新后滚动
  await nextTick()
  
  // 平滑滚动到底部
  const scrollToBottomSmooth = () => {
    // 1. 滚动聊天容器
    const container = messagesContainer.value
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
    
    // 2. 滚动整个页面
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
    
    // 3. 滚动窗口到底部
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
  }

  // 添加延迟以确保动画效果
  setTimeout(scrollToBottomSmooth, 100)
}

function formatMessage(text) {
  // 只处理换行，不处理代码格式
  return text.replace(/\n/g, '<br>')
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    // 移除行内代码
    .replace(/`[^`]*`/g, '')
    // 移除多个的空行
    .replace(/(<br>){3,}/g, '<br><br>')
    // 确保文本左对齐
    .trim();
}

function autoResize(e) {
  const textarea = e.target
  
  // 重置高度以正确计算 scrollHeight
  textarea.style.height = '40px'
  
  // 计算新的高度，限制在 40px 到 160px 之间
  const scrollHeight = textarea.scrollHeight
  const newHeight = Math.min(Math.max(scrollHeight, 40), 160)
  
  // 设置新的高度
  textarea.style.height = `${newHeight}px`
  
  // 如果内容超过最大高度，显示滚动条
  textarea.style.overflowY = scrollHeight > 160 ? 'auto' : 'hidden'
  
  // 调整搜索按钮的位置
  const searchBtn = document.querySelector('.search-btn')
  if (searchBtn) {
    // 计算搜索按钮应该移动的距离
    const buttonOffset = newHeight - 40 // 40px 是初始高度
    searchBtn.style.transform = `translateY(${buttonOffset}px)`
  }
}

async function copyMessage(msg) {
  try {
    await navigator.clipboard.writeText(msg.content)
    // Show copy success notification
  } catch (err) {
    console.error('复制失败:', err)
  }
}

function editMessage(msg) {
  editingMessage.value = msg
  prompt.value = msg.content
}

async function sendMessage() {
  if (!prompt.value.trim() || !selectedModel.value || isLoading.value) return
  
  isLoading.value = true
  
  const userMessage = {
    role: 'user',
    content: prompt.value.trim(),
    timestamp: new Date()
  }
  
  try {
    // 保存用户消息
    await saveMessageToServer(userMessage)
    modelMessages.value[selectedModel.value].push(userMessage)
    
    console.log('发送消息到模型:', {
      model: selectedModel.value,
      content: prompt.value.trim()
    })
    
    const systemPrompt = modelPrompts.value[selectedModel.value]
    const messages = [
      { role: 'system', content: systemPrompt },
      ...modelMessages.value[selectedModel.value]
        .filter(msg => !msg.isLoading)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))
    ]

    let response;
    
    if (selectedModel.value.startsWith('ollama-')) {
      // Ollama API 调用
      console.log('调用 Ollama API:', {
        model: selectedModel.value,
        messages: messages
      })
      
      response = await fetch(`${API_URL}/api/ollama/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel.value,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Ollama 响应数据:', data);

      // 添加助手回复
      const assistantMessage = {
        role: 'assistant',
        content: data.response || data.message || '抱歉，模型返回为空',
        timestamp: new Date()
      };
      
      await saveMessageToServer(assistantMessage)
      modelMessages.value[selectedModel.value].push(assistantMessage);
      
    } else {
      // 其他模型的 API 调用
      console.log('调用其他模型 API:', {
        model: selectedModel.value,
        messages: messages
      })
      
      response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel.value,
          input: {
            messages: messages
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('模型响应数据:', data);

      // 添加助手回复
      const assistantMessage = {
        role: 'assistant',
        content: data.response || data.message || '抱歉，模型返回为空',
        timestamp: new Date()
      };
      
      await saveMessageToServer(assistantMessage)
      modelMessages.value[selectedModel.value].push(assistantMessage);
    }

    prompt.value = ''
    scrollToBottom()
    
  } catch (error) {
    console.error('发送消息失败:', error)
    
    // 添加错误消息
    const errorMessage = {
      role: 'assistant',
      content: `发送消息失败: ${error.message}`,
      timestamp: new Date(),
      isError: true
    }
    modelMessages.value[selectedModel.value].push(errorMessage)
    
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 滚动相关的函数
const showBackToTop = ref(false)
const messagesContainer = ref(null)

function scrollToTop() {
  // 滚动聊天容器到顶部
  const container = messagesContainer.value
  if (container) {
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
  
  // 滚动整个页面到顶部
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function scrollToBottom() {
  const scrollToBottomSmooth = () => {
    // 1. 滚动聊天容器
    const container = messagesContainer.value
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
    
    // 2. 滚动整个页面
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
    
    // 3. 滚动窗口到底部
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
  }

  // 添加延迟以确保动画效果
  setTimeout(scrollToBottomSmooth, 100)
}

function handleScroll(e) {
  const container = e.target
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  
  // 同时检查内部容器和页面的滚动位置
  const windowScrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowScrollHeight = document.documentElement.scrollHeight
  const windowClientHeight = document.documentElement.clientHeight
  
  // 当内部容器或页面任一滚动超过一屏时显示按钮
  showBackToTop.value = scrollTop > 300 || 
                       (scrollHeight - scrollTop - clientHeight) > 300 ||
                       windowScrollTop > 300 || 
                       (windowScrollHeight - windowScrollTop - windowClientHeight) > 300
}

// Add image load error handling function
function handleImageError(e) {
  // Set default image
  e.target.src = '/icons/default-avatar.png'
}

function getModelIcon(modelId) {
  switch (modelId) {
    case 'qwen-long':
      return 'fas fa-scroll'
    case 'qwen-plus-1220':
      return 'fas fa-crown'
    case 'qwen-max':
      return 'fas fa-bolt'
    case 'qwen-lv-max':
      return 'fas fa-infinity'
    case 'gemini-1.5-flash':
      return 'fa-solid fa-gem' // 使用标准的宝石图标
    case 'gemini-2.0-flash':
      return 'fa-solid fa-star' // 使用标准的星星图标
    case 'ollama-mistral':
      return 'fas fa-fire'
    case 'ollama-llama2':
      return 'fas fa-dragon'
    case 'ollama-zephyr':
      return 'fas fa-wind'
    case 'ollama-qwen':
      return 'fas fa-robot'
    case 'glm-4-flash':
      return 'fas fa-brain'
    case 'deepseek-v3':
      return 'fas fa-lightbulb'
    default:
      return 'fas fa-robot'
  }
}

function getModelIconClass() {
  switch (selectedModel.value) {
    case 'qwen-long':
      return 'model-icon-blue'
    case 'qwen-plus-1220':
      return 'model-icon-purple'
    case 'qwen-max':
      return 'model-icon-gold'
    case 'qwen-lv-max':
      return 'model-icon-green'
    case 'gemini-1.5-flash':
      return 'model-icon-gemini-1'
    case 'gemini-2.0-flash':
      return 'model-icon-gemini-2'
    case 'ollama-mistral':
      return 'model-icon-mistral'
    case 'ollama-llama2':
      return 'model-icon-orange'
    case 'ollama-zephyr':
      return 'model-icon-cyan'
    case 'ollama-qwen':
      return 'model-icon-blue'
    case 'glm-4-flash':
      return 'model-icon-glm'
    case 'deepseek-v3':
      return 'model-icon-deepseek'
    default:
      return ''
  }
}

async function clearCurrentChat() {
  if (selectedModel.value) {
    await clearMessagesFromServer(selectedModel.value)
  }
}

const showHistory = ref(false)
const historyTab = ref('qwen-long')

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Add custom related reactive data
const showCustomize = ref(false)

// Add API settings related reactive data
const apiSettings = ref({
  apiKey: '',
  appId: '',
  defaultModel: 'qwen-long',
  maxLength: 2000,
  temperature: 0.7
})

// Add model prompts related reactive data
const modelPrompts = ref({
  'qwen-long': '你是一个专业的AI助手，请用简洁专业的语言回答问题。',
  'qwen-plus-1220': '你是一个有创造力的AI助手，可以从多个角度思考问题。',
  'qwen-max': '你是一个强大的AI助手，具有出色的理解和生成能力。',
  'qwen-lv-max': '你是一个支持长文本的AI助手，擅长处理复杂的上下文。',
  'ollama-mistral': '你是一个基于Mistral的本地AI助手，擅长多语言理解和生成。',
  'ollama-llama2': '你是一个基于Llama2的本地AI助手，擅长多语言理解和生成。',
  'ollama-zephyr': '你是一个基于Zephyr的本地AI助手，擅长对话和指令理解。',
  'ollama-qwen': '你是一个基于Qwen 2.5的本地AI助手，专注于中文交互和理解。'
})

// Save API settings
function saveApiSettings() {
  localStorage.setItem('apiSettings', JSON.stringify(apiSettings.value))
  localStorage.setItem('modelPrompts', JSON.stringify(modelPrompts.value))
  showSettings.value = false
}

// Reset API settings
function resetApiSettings() {
  apiSettings.value = {
    apiKey: '',
    appId: '',
    defaultModel: 'qwen-long',
    maxLength: 2000,
    temperature: 0.7
  }
  modelPrompts.value = {
    'qwen-long': '你是一个专业的AI助手，请用简洁专业的语言回答问题。',
    'qwen-plus-1220': '你是一个有创造力的AI助手，可以从多个角度思考问题。',
    'qwen-max': '你是一个强大的AI助手，具有出色的理解和生成能力。',
    'qwen-lv-max': '你是一个支持长文本的AI助手，擅长处理复杂的上下文。',
    'ollama-mistral': '你是一个基于Mistral的本地AI助手，擅长多语言理解和生成。',
    'ollama-llama2': '你是一个基于Llama2的本地AI助手，擅长多语言理解和生成。',
    'ollama-zephyr': '你是一个基于Zephyr的本地AI助手，擅长对话和指令理解。',
    'ollama-qwen': '你是一个基于Qwen 2.5的本地AI助手，专注于中文交互和理解。'
  }
}

// Save custom settings
function saveCustomize() {
  // Apply background style
  const appContainer = document.querySelector('.app-container')
  if (appContainer) {
    Object.assign(appContainer.style, backgroundStyle.value)
  }
  
  // Apply bubble style to actual messages
  const style = document.createElement('style')
  style.textContent = `
    .message.user .message-content {
      background-color: ${settings.value.userBubble.backgroundColor} !important;
      color: ${settings.value.userBubble.textColor} !important;
      border-radius: ${settings.value.userBubble.borderRadius}px !important;
    }
    .message.assistant .message-content {
      background-color: ${settings.value.assistantBubble.backgroundColor} !important;
      color: ${settings.value.assistantBubble.textColor} !important;
      border-radius: ${settings.value.assistantBubble.borderRadius}px !important;
    }
  `
  
  // Remove old styles
  const oldStyle = document.querySelector('#custom-message-styles')
  if (oldStyle) {
    oldStyle.remove()
  }
  
  // Add new styles
  style.id = 'custom-message-styles'
  document.head.appendChild(style)
  
  // Save settings to local storage
  localStorage.setItem('chatSettings', JSON.stringify(settings.value))
  
  showCustomize.value = false
}

// Reset custom settings
function resetCustomize() {
  settings.value = {
    background: {
      type: 'color',
      color: '#f9fafb',
      gradientStart: '#ffffff',
      gradientEnd: '#f0f2f5',
      gradientAngle: 45,
      imageUrl: ''
    },
    userBubble: {
      backgroundColor: '#1677ff',
      textColor: '#ffffff',
      borderRadius: 12
    },
    assistantBubble: {
      backgroundColor: '#f4f6f8',
      textColor: '#333333',
      borderRadius: 12
    }
  }
}

// 键盘控制相关变量
const keyPressTimer = ref(null)
const scrollInterval = ref(null)
const LONG_PRESS_DELAY = 500 // 长按判定时间（毫秒）
const SCROLL_INTERVAL = 50 // 滚动间隔（毫秒）
const SCROLL_STEP = 100 // 每次滚动的像素

// 平滑滚动函数
function smoothScroll(direction) {
  const container = messagesContainer.value
  if (container) {
    container.scrollTop += direction * SCROLL_STEP
  }
}

// 修改键盘按下事件处理
function handleKeydown(e) {
  // 禁用 Alt 键的默认功能
  if (e.altKey || e.key === 'Alt') {
    e.preventDefault()
    
    // 如果搜索框展开，则收起
    if (isSearchExpanded.value) {
      isSearchExpanded.value = false
      prompt.value = ''
      const inputTip = document.querySelector('.input-tip')
      if (inputTip) {
        inputTip.classList.remove('show')
      }
    }
    return
  }

  // 处理回车键发送消息
  if (e.key === 'Enter' && !e.shiftKey && isSearchExpanded.value && prompt.value.trim()) {
    e.preventDefault()
    if (!isLoading.value) {
      sendMessage()
    }
    return
  }

  // 处理空格键
  if (e.code === 'Space' && !isSearchExpanded.value && !isInputFocused()) {
    e.preventDefault()
    isSearchExpanded.value = true
    const inputTip = document.querySelector('.input-tip')
    if (inputTip) {
      inputTip.classList.add('show')
    }
    // 添加自动滚动到底部
    scrollToBottom()
    nextTick(() => {
      const textarea = document.querySelector('.efm_ant-input')
      if (textarea) {
        textarea.focus()
      }
    })
    return
  }

  // 如果搜索框已展开且不是功能键，直接让输入框获得焦点
  if (isSearchExpanded.value && 
      !e.altKey && 
      !e.ctrlKey && 
      !e.metaKey && 
      e.key.length === 1 && 
      !isInputFocused()) {
    const textarea = document.querySelector('.efm_ant-input')
    if (textarea) {
      textarea.focus()
    }
  }
  
  // 处理上键
  if (e.code === 'ArrowUp') {
    e.preventDefault()
    
    // 如果搜索框展开，收起搜索框
    if (isSearchExpanded.value) {
      isSearchExpanded.value = false
      prompt.value = ''
      const inputTip = document.querySelector('.input-tip')
      if (inputTip) {
        inputTip.classList.remove('show')
      }
      // 滚动到顶部
      scrollToTop()
    }
    
    // 如果已经在长按状态，不要重复设置
    if (scrollInterval.value) return
    
    // 设置长按检测
    keyPressTimer.value = setTimeout(() => {
      // 进入长按状态
      clearTimeout(keyPressTimer.value)
      keyPressTimer.value = null
      
      // 如果搜索框展开，收起搜索框
      if (isSearchExpanded.value) {
        isSearchExpanded.value = false
        prompt.value = ''
        const inputTip = document.querySelector('.input-tip')
        if (inputTip) {
          inputTip.classList.remove('show')
        }
      }
      
      // 开始持续滚动
      smoothScroll(-1)
      scrollInterval.value = setInterval(() => {
        smoothScroll(-1)
      }, SCROLL_INTERVAL)
    }, LONG_PRESS_DELAY)
    
    return
  }

  // 处理下键滚动
  if (e.code === 'ArrowDown' && !isInputFocused()) {
    e.preventDefault()
    
    // 如果已经在长按状态，不要重复设置
    if (scrollInterval.value) return
    
    // 设置长按检测
    keyPressTimer.value = setTimeout(() => {
      // 进入长按状态
      clearTimeout(keyPressTimer.value)
      keyPressTimer.value = null
      
      // 开始持续滚动
      smoothScroll(1)
      scrollInterval.value = setInterval(() => {
        smoothScroll(1)
      }, SCROLL_INTERVAL)
    }, LONG_PRESS_DELAY)
  }
}

// 修改键盘抬起事件处理
function handleKeyup(e) {
  // 处理方向键
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
    e.preventDefault()
    
    // 如果按键时间小于长按判定时间，则视为点击
    if (keyPressTimer.value) {
      clearTimeout(keyPressTimer.value)
      keyPressTimer.value = null
      
      // 点击行为：控制回到顶部/底部按钮
      if (e.code === 'ArrowUp' && !isInputFocused()) {
        scrollToTop()
      } else if (e.code === 'ArrowDown' && !isInputFocused()) {
        scrollToBottom()
      }
    }
    
    // 清除滚动定时器
    if (scrollInterval.value) {
      clearInterval(scrollInterval.value)
      scrollInterval.value = null
    }
  }
}

// 检查是否有输入框在获取焦点
function isInputFocused() {
  const activeElement = document.activeElement
  return activeElement.tagName === 'INPUT' || 
         activeElement.tagName === 'TEXTAREA' || 
         activeElement.isContentEditable
}

// 在组件挂载时加键盘事件监听
onMounted(() => {
  // 添加滚动监听
  const container = messagesContainer.value
  if (container) {
    container.addEventListener('scroll', handleScroll)
  }
  
  // 添加页面滚动监听
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  
  // 加载自定义设置
  const savedSettings = localStorage.getItem('chatSettings')
  if (savedSettings) {
    settings.value = JSON.parse(savedSettings)
    saveCustomize()
  }
  
  // 加载 API 设置
  const savedApiSettings = localStorage.getItem('apiSettings')
  if (savedApiSettings) {
    apiSettings.value = JSON.parse(savedApiSettings)
  }

  // 加载模型提示词配置
  const savedModelPrompts = localStorage.getItem('modelPrompts')
  if (savedModelPrompts) {
    modelPrompts.value = JSON.parse(savedModelPrompts)
  }

  // 加载历史消息
  for (const model of models) {
    loadMessagesFromServer(model.id)
  }
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  const container = messagesContainer.value
  if (container) {
    container.removeEventListener('scroll', handleScroll)
  }
  // 移除页面滚动监听
  window.removeEventListener('scroll', handleScroll)
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeydown)
})

// Add calculated properties
const userBubbleStyle = computed(() => ({
  backgroundColor: settings.value.userBubble.backgroundColor,
  color: settings.value.userBubble.textColor,
  borderRadius: `${settings.value.userBubble.borderRadius}px`
}))

const assistantBubbleStyle = computed(() => ({
  backgroundColor: settings.value.assistantBubble.backgroundColor,
  color: settings.value.assistantBubble.textColor,
  borderRadius: `${settings.value.assistantBubble.borderRadius}px`
}))

const backgroundStyle = computed(() => {
  const { type, color, gradientStart, gradientEnd, gradientAngle, imageUrl } = settings.value.background
  
  if (type === 'color') {
    return { backgroundColor: color }
  } else if (type === 'gradient') {
    return {
      background: `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`
    }
  } else if (type === 'image') {
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  
  return {}
})

// Add showSettings reactive data
const showSettings = ref(false)
const settings = ref({
  background: {
    type: 'color',
    color: '#f9fafb',
    gradientStart: '#ffffff',
    gradientEnd: '#f0f2f5',
    gradientAngle: 45,
    imageUrl: ''
  },
  userBubble: {
    backgroundColor: '#1677ff',
    textColor: '#ffffff',
    borderRadius: 12
  },
  assistantBubble: {
    backgroundColor: '#f4f6f8',
    textColor: '#333333',
    borderRadius: 12
  }
})

function handleSearchClick() {
  if (!isSearchExpanded.value) {
    isSearchExpanded.value = true
    nextTick(() => {
      const textarea = document.querySelector('.efm_ant-input')
      if (textarea) {
        textarea.focus()
        // 初始化高度为40px
        textarea.style.height = '40px'
        textarea.style.overflowY = 'hidden'
      }
    })
  } else if (prompt.value.trim() && !isLoading.value) {
    sendMessage()
  }
}

// 修改 watch 监听器
watch(prompt, (newValue) => {
  nextTick(() => {
    const textarea = document.querySelector('.efm_ant-input')
    if (textarea) {
      // 重置高度以正确计算 scrollHeight
      textarea.style.height = '40px'
      
      // 计算新的高度，限制在 40px 到 160px 之间
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, 40), 160)
      
      // 设置新的高度
      textarea.style.height = `${newHeight}px`
      
      // 如果内容超过最大高度，显示滚动条
      textarea.style.overflowY = scrollHeight > 160 ? 'auto' : 'hidden'
      
      // 调整容器的高度
      const searchContainer = textarea.closest('.search-container')
      if (searchContainer) {
        searchContainer.style.height = `${newHeight}px`
      }
    }
  })
})

// 添加新的响应式数据
const showModelSelector = ref(true)
const activeTab = ref(0)
const modelTabs = [
  'Qwen模型',
  'Ollama模型',
  'Google模型',
  '智谱AI',
  'DeepSeek'
]

// 根据选中的标签页过滤模型
const filteredModels = computed(() => {
  switch(activeTab.value) {
    case 0: // Qwen模型
      return models.filter(m => m.id.startsWith('qwen'))
    case 1: // Ollama模型
      return models.filter(m => m.id.startsWith('ollama'))
    case 2: // Google模型
      return models.filter(m => m.id.startsWith('gemini'))
    case 3: // 智谱AI
      return models.filter(m => m.id.startsWith('glm'))
    case 4: // DeepSeek
      return models.filter(m => m.id.startsWith('deepseek'))
    default:
      return models
  }
})

// 修改模型标签的图标
function getTabIcon(index) {
  switch(index) {
    case 0: // Qwen模型
      return 'fas fa-robot'
    case 1: // Ollama模型
      return 'fas fa-cube'
    case 2: // Google模型
      return 'fa-solid fa-gem' // 使用标准的宝石图标
    case 3: // 智谱AI
      return 'fas fa-brain'
    case 4: // DeepSeek
      return 'fas fa-lightbulb'
    default:
      return 'fas fa-layer-group'
  }
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
}

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
  font-size: 14px;
}

.icon-btn i {
  font-size: 16px;
}

.icon-btn:hover {
  color: #1677ff;
}

.select-model-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: white;
  color: #666;
  cursor: pointer;
}

.main-content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.model-tabs {
  display: flex;
  gap: 24px;
  padding: 0;
  justify-content: center;
}

.tab {
  color: #666;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.tab i {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.tab:hover {
  background: rgba(22, 119, 255, 0.1);
  color: #1677ff;
}

.tab.active {
  background: #e6f4ff;
  color: #1677ff;
}

/* 为不同标签设置不同的激活样式 */
.tab.active:nth-child(1) {
  background: linear-gradient(135deg, #e6f4ff, #f0f9ff);
  color: #1677ff;
}

.tab.active:nth-child(2) {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #ff4500;
}

.tab.active:nth-child(3) {
  background: linear-gradient(135deg, #f0f0f0, #e6e6e6);
  color: #666;
}

.tab.active:nth-child(4) {
  background: linear-gradient(135deg, #f6ffed, #d9f7be);
  color: #52c41a;
}

.tab.active:nth-child(5) {
  background: linear-gradient(135deg, #e6fffb, #b5f5ec);
  color: #13c2c2;
}

/* 为不同标签的图标设置渐变色 */
.tab.active:nth-child(1) i {
  background: linear-gradient(135deg, #1677ff, #4096ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tab.active:nth-child(2) i {
  background: linear-gradient(135deg, #ff8c00, #ff4500);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tab.active:nth-child(3) i {
  background: linear-gradient(135deg, #666666, #999999);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tab.active:nth-child(4) i {
  background: linear-gradient(135deg, #389e0d, #52c41a);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tab.active:nth-child(5) i {
  background: linear-gradient(135deg, #08979c, #13c2c2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.model-section {
  padding: 0;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  animation: fadeIn 0.3s ease;
}

.model-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #1677ff;
}

.model-card.active {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
}

.select-model-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
}

.select-model-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
  background: #f0f5ff;
}

.select-model-btn i {
  font-size: 14px;
}

.model-select-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.model-select-btn.select {
  color: #1677ff;
  background: #f0f5ff;
}

.model-select-btn:not(.select) {
  color: #52c41a;
  background: #f6ffed;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.model-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
}

/* 为不同模型设置不同的图标样式 */
.model-card[data-model="qwen-long"] .model-icon {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}
.model-card[data-model="qwen-long"] .model-icon i {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2));
}

.model-card[data-model="qwen-plus-1220"] .model-icon {
  background: linear-gradient(135deg, #f9ecff, #f4e3ff);
}
.model-card[data-model="qwen-plus-1220"] .model-icon i {
  background: linear-gradient(135deg, #9333ea, #a855f7);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(147, 51, 234, 0.2));
}

.model-card[data-model="qwen-max"] .model-icon {
  background: linear-gradient(135deg, #fff7e6, #fff1d6);
}
.model-card[data-model="qwen-max"] .model-icon i {
  background: linear-gradient(135deg, #d97706, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(217, 119, 6, 0.2));
}

.model-card[data-model="qwen-lv-max"] .model-icon {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
}
.model-card[data-model="qwen-lv-max"] .model-icon i {
  background: linear-gradient(135deg, #059669, #10b981);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(5, 150, 105, 0.2));
}

.model-card:hover .model-icon {
  transform: scale(1.05);
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #1f2937;
}

.model-tokens {
  font-size: 13px;
  color: #1677ff;
  font-weight: 500;
  padding: 2px 8px;
  background: #e6f4ff;
  border-radius: 4px;
  display: inline-block;
}

.model-desc {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
  margin: 12px 0;
}

.model-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.model-update {
  color: #6b7280;
  font-size: 13px;
}

.model-select-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.model-select-btn.select {
  background: #e6f4ff;
  color: #1677ff;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  height: calc(100vh - 200px);
}

.chat-container {
  position: relative;
  height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 24px;
  margin-bottom: 120px;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  padding: 0 16px;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 85%;
  width: fit-content;
}

.message.user {
  align-self: flex-end;
  text-align: left;
}

.message.assistant {
  align-self: flex-start;
  text-align: left;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.message.user .message-header {
  flex-direction: row-reverse;
}

.message-content {
  position: relative;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  margin: 0 16px;
  word-break: break-word;
  white-space: pre-wrap;
  min-width: 60px;
  text-align: left;
}

.message.user .message-content {
  background: #1677ff;
  color: white;
  border-radius: 12px 12px 0 12px;
  margin-right: 0;
  margin-left: auto;
}

.message.assistant .message-content {
  background: #f4f6f8;
  color: #333;
  border-radius: 12px 12px 12px 0;
  margin-left: 0;
  margin-right: auto;
}

.message.user .actions {
  flex-direction: row-reverse;
  padding-right: 16px;
}

.message.assistant .actions {
  padding-left: 16px;
}

.actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
  width: 100%;
}

.message:hover .actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1677ff;
}

.message.user .action-btn {
  color: rgba(255, 255, 255, 0.8);
}

.message.user .action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.avatar-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e6f4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1677ff;
  font-size: 18px;
  flex-shrink: 0;
}

.name {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.select-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
}

.select-hint i {
  font-size: 48px;
}

.ModelTextArea__textarea-wrap--OYPVC {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: white;
  border-top: 1px solid #e5e7eb;
  max-width: 1000px;
  width: 64px;
  height: 64px;
  position: fixed;
  bottom: 20px;
  border-radius: 12px;
  right: 24px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 1s cubic-bezier(0.33, 1, 0.68, 1);
  overflow: hidden;
}

.ModelTextArea__textarea-wrap--OYPVC.expanded-wrapper {
  width: calc(100% - 48px);
  max-width: 1000px;
  height: auto;
  padding: 24px;
  left: 50%;
  transform: translateX(-50%);
  right: auto;
}

.ModelTextArea__file-textarea-wrap--LG7uH {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 1s cubic-bezier(0.33, 1, 0.68, 1);
  width: 40px;
  margin: 0 0 0 auto;
  position: relative;
}

.search-container.expanded {
  width: 100%;
  margin: 0 auto;
  display: flex;
  position: relative;
}

.search-content {
  flex: 1;
  opacity: 0;
  transition: all 1s cubic-bezier(0.33, 1, 0.68, 1);
  visibility: hidden;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  min-height: 40px;
  width: 100%;
}

.expanded .search-content {
  opacity: 1;
  visibility: visible;
  display: block;
}

.efm_ant-input {
  width: 100%;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  background: transparent;
  text-align: left;
  min-height: 40px;
  max-height: 160px;
  height: 40px;
  resize: none;
  overflow-y: auto;
  line-height: 1.5;
  display: block;
  box-shadow: none;
  outline: none;
}

/* 修改滚动条样式 */
.efm_ant-input::-webkit-scrollbar {
  width: 3px;
  height: 6px;
  background-color: transparent;
}

.efm_ant-input::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.efm_ant-input::-webkit-scrollbar-track {
  background: transparent;
  border: none;
}

.search-btn {
  padding: 1px 1px;
  width: 41px;
  height: 40px;
  border: none;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 1s cubic-bezier(0.33, 1, 0.68, 1);
  flex-shrink: 0;
  border-radius: 6px;
  font-size: 14px;
  right: -5px;
  top: 0;
  transform: translateY(0);
}

.expanded .search-btn {
  width: 100px;
  padding: 0 16px;
}

.search-btn i {
  margin-right: 4px;
  font-size: 14px;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  background: none;
  text-shadow: none;
}

.expanded .search-btn i {
  margin-right: 8px;
  font-size: 16px;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  background: none;
}

.search-btn:hover:not(.disabled) {
  background: linear-gradient(135deg, #1677ff, #1677ff);
}

.search-btn.disabled {
  background: linear-gradient(135deg, #d9d9d9, #f0f0f0);
  cursor: not-allowed;
}

.input-tip {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  padding: 0 12px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 1s cubic-bezier(0.33, 1, 0.68, 1);
  margin-top: 8px;
}

.expanded-wrapper .input-tip {
  opacity: 0;
  visibility: hidden;
}

.expanded-wrapper .input-tip.show {
  opacity: 1;
  visibility: visible;
  transition-delay: 1s;
}

.back-to-top {
  position: fixed;
  bottom: 140px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  z-index: 99;
}

.back-to-bottom {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  z-index: 99;
}

.back-to-top:hover,
.back-to-bottom:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.arrow {
  font-size: 20px;
  color: #666;
  line-height: 1;
}

.arrow-down {
  transform: rotate(180deg);
}

.back-to-top i,
.back-to-bottom i {
  font-size: 20px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.history-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.history-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.history-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 20px;
  background: linear-gradient(to right, #ffffff, #f8f9fa);
}

.history-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.history-tabs {
  display: flex;
  gap: 12px;
  padding: 50px 30px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
  flex-wrap: wrap;

}

.history-tab {
  padding: 15px 20px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  transition: all 0.3s;
  white-space: nowrap;
  border: 1px solid #e5e7eb;
  position: relative;
}

.history-tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.history-tab:hover::before {
  opacity: 1;
}

/* 为不同模型设置不同的渐变色 */
.history-tab[data-model="qwen-long"] {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border-color: #60a5fa;
}

.history-tab[data-model="qwen-plus-1220"] {
  background: linear-gradient(135deg, #f9ecff, #f4e3ff);
  border-color: #d8b4fe;
}

.history-tab[data-model="qwen-max"] {
  background: linear-gradient(135deg, #fff7e6, #fff1d6);
  border-color: #fcd34d;
}

.history-tab[data-model="qwen-lv-max"] {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border-color: #6ee7b7;
}

.history-tab.active[data-model="qwen-long"] {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white;
  border-color: transparent;
}

.history-tab.active[data-model="qwen-plus-1220"] {
  background: linear-gradient(135deg, #9333ea, #a855f7);
  color: white;
  border-color: transparent;
}

.history-tab.active[data-model="qwen-max"] {
  background: linear-gradient(135deg, #d97706, #fbbf24);
  color: white;
  border-color: transparent;
}

.history-tab.active[data-model="qwen-lv-max"] {
  background: linear-gradient(135deg, #059669, #10b981);
  color: white;
  border-color: transparent;
}

/* 添加新的图标样式类 */
.model-icon-gold {
  background: linear-gradient(135deg, #fff7e6, #fff1d6) !important;
  border-color: #fcd34d !important;
}
.model-icon-gold i {
  background: linear-gradient(135deg, #d97706, #fbbf24) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(217, 119, 6, 0.2)) !important;
}

.model-icon-green {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5) !important;
  border-color: #6ee7b7 !important;
}
.model-icon-green i {
  background: linear-gradient(135deg, #059669, #10b981) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(5, 150, 105, 0.2)) !important;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  border-radius: 20px;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
}

.history-messages {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.history-message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.message-time {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-message .message-content {
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  transition: all 0.3s;
}

.history-message .message-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.history-message .message-content.user {
  background: linear-gradient(135deg, #92abcc, #4096ff);
  color: #ffffff;
  font-weight: 500;
  align-self: flex-end;
  margin-left: 20%;
  border: none;
}

.history-message .message-content.assistant {
  background: linear-gradient(135deg, #f4f6f8, #ffffff);
  color: #333;
  align-self: flex-start;
  margin-right: 20%;
  border: 1px solid #e5e7eb;
}

.message-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.history-message:hover .message-actions {
  opacity: 1;
}

.message-action-btn {
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  transition: all 0.3s;
}

.message-action-btn:hover {
  background: #1677ff;
  color: white;
  border-color: transparent;
}

.message-action-btn i {
  font-size: 14px;
}

.history-empty {
  text-align: center;
  color: #666;
  padding: 48px 32px;
  background: linear-gradient(135deg, #f4f6f8, #ffffff);
  border-radius: 12px;
  border: 1px dashed #e5e7eb;
  margin: 24px;
}

.history-empty i {
  font-size: 48px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.settings-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
}

.settings-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #000000, #333333);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: rgba(255, 255, 255, 0.8);
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

.settings-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s;
  padding: 12px;
  border-radius: 12px;
}

.setting-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.setting-item label {
  min-width: 120px;
  font-size: 15px;
  color: #1d1d1f;
  font-weight: 500;
}

.settings-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.9);
}

.settings-input:hover {
  border-color: rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 1);
}

.settings-input:focus {
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
  outline: none;
  background: #ffffff;
}

.settings-footer {
  padding: 24px 32px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
}

.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #0071e3;
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  letter-spacing: -0.2px;
}

.btn-primary:hover {
  background: #0077ed;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2);
}

.btn-secondary {
  padding: 12px 24px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  color: #1d1d1f;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  letter-spacing: -0.2px;
}

.btn-secondary:hover {
  border-color: rgba(0, 0, 0, 0.2);
  background: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.bubble-settings {
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.bubble-settings h5 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

.settings-preview {
  margin-top: 32px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.settings-preview h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.preview-messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

.preview-message {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.preview-bubble {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 80%;
  transition: all 0.3s;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.preview-message.user {
  align-items: flex-end;
}

.preview-message.assistant {
  align-items: flex-start;
}

.preview-message.user .preview-bubble {
  background: v-bind('settings.userBubble.backgroundColor');
  color: v-bind('settings.userBubble.textColor');
  border-radius: v-bind('`${settings.userBubble.borderRadius}px`');
}

.preview-message.assistant .preview-bubble {
  background: v-bind('settings.assistantBubble.backgroundColor');
  color: v-bind('settings.assistantBubble.textColor');
  border-radius: v-bind('`${settings.assistantBubble.borderRadius}px`');
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.preview-message.user .preview-bubble {
  background: v-bind('settings.userBubble.backgroundColor');
  color: v-bind('settings.userBubble.textColor');
  border-radius: v-bind('`${settings.userBubble.borderRadius}px`');
}

.preview-message.assistant .preview-bubble {
  background: v-bind('settings.assistantBubble.backgroundColor');
  color: v-bind('settings.assistantBubble.textColor');
  border-radius: v-bind('`${settings.assistantBubble.borderRadius}px`');
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.preview-messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

.preview-message {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.preview-bubble {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 80%;
  transition: all 0.3s;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.settings-input.prompt-input {
  min-height: 100px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.6;
  font-family: system-ui, -apple-system, sans-serif;
}

.model-icon-orange {
  background: linear-gradient(135deg, #ffd700, #ff8c00) !important;
  border-color: #ff6b00 !important;
}

.model-icon-orange i {
  background: linear-gradient(135deg, #ff6b00, #ff4500) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(255, 107, 0, 0.2)) !important;
}

.message.assistant.model-icon-orange {
  background: linear-gradient(135deg, #ffd700, #ff8c00) !important;
  color: white !important;
}

.message.assistant.model-icon-orange .message-content {
  background: rgba(255, 165, 0, 0.1) !important;
  border: 1px solid rgba(255, 165, 0, 0.2) !important;
}

/* 为不同的 Ollama 模型设置不同的样式 */
.model-card[data-model="ollama-llama2"] .model-icon {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
}
.model-card[data-model="ollama-llama2"] .model-icon i {
  background: linear-gradient(135deg, #ff6b00, #ff4500);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(255, 107, 0, 0.2));
}

.model-card[data-model="ollama-zephyr"] .model-icon {
  background: linear-gradient(135deg, #00bcd4, #00acc1);
}
.model-card[data-model="ollama-zephyr"] .model-icon i {
  background: linear-gradient(135deg, #0097a7, #00838f);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(0, 151, 167, 0.2));
}

.model-card[data-model="ollama-qwen"] .model-icon {
  background: linear-gradient(135deg, #1677ff, #4096ff);
}
.model-card[data-model="ollama-qwen"] .model-icon i {
  background: linear-gradient(135deg, #0958d9, #1677ff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(22, 119, 255, 0.2));
}

/* 为不同的 Ollama 模型设置历史记录标签样式 */
.history-tab[data-model="ollama-llama2"] {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border-color: #ff6b00;
}
.history-tab.active[data-model="ollama-llama2"] {
  background: linear-gradient(135deg, #ff6b00, #ff4500);
  color: white;
  border-color: transparent;
}

.history-tab[data-model="ollama-zephyr"] {
  background: linear-gradient(135deg, #00bcd4, #00acc1);
  border-color: #0097a7;
}
.history-tab.active[data-model="ollama-zephyr"] {
  background: linear-gradient(135deg, #0097a7, #00838f);
  color: white;
  border-color: transparent;
}

.history-tab[data-model="ollama-qwen"] {
  background: linear-gradient(135deg, #1677ff, #4096ff);
  border-color: #0958d9;
}
.history-tab.active[data-model="ollama-qwen"] {
  background: linear-gradient(135deg, #0958d9, #1677ff);
  color: white;
  border-color: transparent;
}

/* 为不同的 Ollama 模型设置消息图标样式 */
.model-icon-orange {
  background: linear-gradient(135deg, #ffd700, #ff8c00) !important;
  border-color: #ff6b00 !important;
}
.model-icon-orange i {
  background: linear-gradient(135deg, #ff6b00, #ff4500) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(255, 107, 0, 0.2)) !important;
}

.model-icon-cyan {
  background: linear-gradient(135deg, #00bcd4, #00acc1) !important;
  border-color: #0097a7 !important;
}
.model-icon-cyan i {
  background: linear-gradient(135deg, #0097a7, #00838f) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(0, 151, 167, 0.2)) !important;
}

/* 添加 Mistral 的新样式 */
.model-card[data-model="ollama-mistral"] .model-icon {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}
.model-card[data-model="ollama-mistral"] .model-icon i {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(217, 119, 6, 0.2));
}

/* 添加 Mistral 的历史记录标签样式 */
.history-tab[data-model="ollama-mistral"] {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-color: #fbbf24;
}

.history-tab.active[data-model="ollama-mistral"] {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: white;
  border-color: transparent;
}

/* 添加 Mistral 的图标样式类 */
.model-icon-mistral {
  background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
  border-color: #fbbf24 !important;
}
.model-icon-mistral i {
  background: linear-gradient(135deg, #d97706, #f59e0b) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(217, 119, 6, 0.2)) !important;
}

/* 添加 Gemini 的样式 */
.model-card[data-model="gemini-1.5-flash"] .model-icon {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
}
.model-card[data-model="gemini-1.5-flash"] .model-icon i {
  background: linear-gradient(135deg, #2e7d32, #43a047);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(46, 125, 50, 0.2));
}

/* 添加 Gemini 的历史记录标签样式 */
.history-tab[data-model="gemini-1.5-flash"] {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-color: #81c784;
}

.history-tab.active[data-model="gemini-1.5-flash"] {
  background: linear-gradient(135deg, #2e7d32, #43a047);
  color: white;
  border-color: transparent;
}

/* 添加 Gemini 的图标样式类 */
.model-icon-gemini-1 {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9) !important;
  border-color: #81c784 !important;
}
.model-icon-gemini-1 i {
  background: linear-gradient(135deg, #2e7d32, #43a047) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(46, 125, 50, 0.2)) !important;
}

/* 添加 Gemini 2.0 的样式 */
.model-card[data-model="gemini-2.0-flash"] .model-icon {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
}
.model-card[data-model="gemini-2.0-flash"] .model-icon i {
  background: linear-gradient(135deg, #6b21a8, #7e22ce);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(107, 33, 168, 0.2));
}

/* 添加 Gemini 2.0 的历史记录标签样式 */
.history-tab[data-model="gemini-2.0-flash"] {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  border-color: #c084fc;
}

.history-tab.active[data-model="gemini-2.0-flash"] {
  background: linear-gradient(135deg, #6b21a8, #7e22ce);
  color: white;
  border-color: transparent;
}

/* 添加 Gemini 2.0 的图标样式类 */
.model-icon-gemini-2 {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff) !important;
  border-color: #c084fc !important;
}
.model-icon-gemini-2 i {
  background: linear-gradient(135deg, #6b21a8, #7e22ce) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(107, 33, 168, 0.2)) !important;
}

/* 添加 GLM 的样式 */
.model-card[data-model="glm-4-flash"] .model-icon {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
}
.model-card[data-model="glm-4-flash"] .model-icon i {
  background: linear-gradient(135deg, #0369a1, #0284c7);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(3, 105, 161, 0.2));
}

/* 添加 GLM 的历史记录标签样式 */
.history-tab[data-model="glm-4-flash"] {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-color: #38bdf8;
}

.history-tab.active[data-model="glm-4-flash"] {
  background: linear-gradient(135deg, #0369a1, #0284c7);
  color: white;
  border-color: transparent;
}

/* 添加 GLM 的图标样式类 */
.model-icon-glm {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe) !important;
  border-color: #38bdf8 !important;
}
.model-icon-glm i {
  background: linear-gradient(135deg, #0369a1, #0284c7) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(3, 105, 161, 0.2)) !important;
}

/* 添加 DeepSeek 的样式 */
.model-card[data-model="deepseek-v3"] .model-icon {
  background: linear-gradient(135deg, #fff1f2, #ffe4e6);
}
.model-card[data-model="deepseek-v3"] .model-icon i {
  background: linear-gradient(135deg, #be123c, #e11d48);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(190, 18, 60, 0.2));
}

/* 添加 DeepSeek 的历史记录标签样式 */
.history-tab[data-model="deepseek-v3"] {
  background: linear-gradient(135deg, #fff1f2, #ffe4e6);
  border-color: #fda4af;
}

.history-tab.active[data-model="deepseek-v3"] {
  background: linear-gradient(135deg, #be123c, #e11d48);
  color: white;
  border-color: transparent;
}

/* 添加 DeepSeek 的图标样式类 */
.model-icon-deepseek {
  background: linear-gradient(135deg, #fff1f2, #ffe4e6) !important;
  border-color: #fda4af !important;
}
.model-icon-deepseek i {
  background: linear-gradient(135deg, #be123c, #e11d48) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 2px 4px rgba(190, 18, 60, 0.2)) !important;
}
</style> 