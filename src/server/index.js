import express from 'express'
import cors from 'cors'
import ollamaService from './services/ollamaService.js'
import qwenService from './services/qwenService.js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3456

// 内存中存储消息历史
const messageStore = {
  'qwen-long': [],
  'qwen-plus': [],
  'qwen-72b': [],
  'ollama-mistral': [],
  'ollama-llama2': [],
  'ollama-zephyr': [],
  'ollama-qwen': []
}

app.use(cors())
app.use(express.json())

// 获取指定模型的消息历史
app.get('/api/messages/:modelId', (req, res) => {
  const { modelId } = req.params
  const messages = messageStore[modelId] || []
  res.json(messages)
})

// 保存消息
app.post('/api/messages', (req, res) => {
  const { modelId, role, content, timestamp } = req.body
  if (!messageStore[modelId]) {
    messageStore[modelId] = []
  }
  messageStore[modelId].push({ role, content, timestamp })
  res.json({ success: true })
})

// 清除指定模型的消息历史
app.delete('/api/messages/:modelId', (req, res) => {
  const { modelId } = req.params
  messageStore[modelId] = []
  res.json({ success: true })
})

// 通用聊天接口
app.post('/api/chat', async (req, res) => {
  try {
    const { model, input } = req.body
    console.log('收到通用聊天请求:', { model, input })
    
    if (!model || !input || !input.messages) {
      return res.status(400).json({ error: '无效的请求参数' })
    }

    let response
    
    // 根据模型类型调用不同的服务
    if (model.startsWith('qwen-')) {
      response = await qwenService.chat(model, input.messages)
    } else if (model.startsWith('ollama-')) {
      const ollamaModel = model.replace('ollama-', '')
      response = await ollamaService.chat(ollamaModel, input.messages)
    } else {
      throw new Error(`不支持的模型类型: ${model}`)
    }
    
    console.log('聊天响应:', response)
    res.json(response)
  } catch (error) {
    console.error('聊天请求失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// Ollama 聊天接口
app.post('/api/ollama/chat', async (req, res) => {
  try {
    const { model, messages } = req.body
    console.log('收到 Ollama 聊天请求:', { model, messages })
    
    const ollamaModel = model.replace('ollama-', '')
    const response = await ollamaService.chat(ollamaModel, messages)
    console.log('Ollama 聊天响应:', response)
    
    res.json(response)
  } catch (error) {
    console.error('Ollama 聊天请求失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// Ollama 模型列表接口
app.get('/api/ollama/models', async (req, res) => {
  try {
    const models = await ollamaService.listModels()
    res.json(models)
  } catch (error) {
    console.error('获取模型列表失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
}) 