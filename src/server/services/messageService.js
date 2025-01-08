import NodeCache from 'node-cache'
import logger from '../utils/logger.js'

// 创建消息缓存实例
const messageCache = new NodeCache({
  stdTTL: 24 * 60 * 60, // 24小时过期
  checkperiod: 60 * 60, // 每小时检查过期
  useClones: false
})

// 为每个模型创建消息存储
const modelKeys = ['qwen-long', 'qwen-plus', 'qwen-72b']
modelKeys.forEach(modelId => {
  if (!messageCache.has(modelId)) {
    messageCache.set(modelId, [])
  }
})

class MessageService {
  // 保存消息
  async saveMessage(modelId, message) {
    try {
      const messages = messageCache.get(modelId) || []
      messages.push({
        ...message,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      })
      messageCache.set(modelId, messages)
      
      logger.info(`消息已保存 - 模型: ${modelId}, 角色: ${message.role}`)
      return true
    } catch (error) {
      logger.error('保存消息失败:', error)
      return false
    }
  }
  
  // 获取指定模型的所有消息
  async getMessages(modelId) {
    try {
      const messages = messageCache.get(modelId) || []
      logger.info(`获取消息 - 模型: ${modelId}, 数量: ${messages.length}`)
      return messages
    } catch (error) {
      logger.error('获取消息失败:', error)
      return []
    }
  }
  
  // 清除指定模型的所有消息
  async clearMessages(modelId) {
    try {
      messageCache.set(modelId, [])
      logger.info(`清除消息 - 模型: ${modelId}`)
      return true
    } catch (error) {
      logger.error('清除消息失败:', error)
      return false
    }
  }
  
  // 获取指定模型的消息数量
  async getMessageCount(modelId) {
    try {
      const messages = messageCache.get(modelId) || []
      return messages.length
    } catch (error) {
      logger.error('获取消息数量失败:', error)
      return 0
    }
  }
  
  // 获取所有模型的消息统计
  async getMessageStats() {
    try {
      const stats = {}
      modelKeys.forEach(modelId => {
        const messages = messageCache.get(modelId) || []
        stats[modelId] = {
          total: messages.length,
          user: messages.filter(m => m.role === 'user').length,
          assistant: messages.filter(m => m.role === 'assistant').length
        }
      })
      return stats
    } catch (error) {
      logger.error('获取消息统计失败:', error)
      return {}
    }
  }
}

export default new MessageService() 