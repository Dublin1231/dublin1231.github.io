import messageService from '../services/messageService.js'
import { ValidationError } from '../utils/errors.js'
import logger from '../utils/logger.js'

// 保存消息
export async function saveMessage(req, res, next) {
  try {
    const { modelId, role, content } = req.body
    
    if (!modelId || !role || !content) {
      throw new ValidationError('缺少必要参数')
    }
    
    const result = await messageService.saveMessage(modelId, {
      role,
      content
    })
    
    if (result) {
      res.json({ success: true })
    } else {
      throw new Error('保存消息失败')
    }
  } catch (error) {
    next(error)
  }
}

// 获取指定模型的消息
export async function getMessages(req, res, next) {
  try {
    const { modelId } = req.params
    
    if (!modelId) {
      throw new ValidationError('缺少模型ID')
    }
    
    const messages = await messageService.getMessages(modelId)
    res.json(messages)
  } catch (error) {
    next(error)
  }
}

// 清除指定模型的消息
export async function clearMessages(req, res, next) {
  try {
    const { modelId } = req.params
    
    if (!modelId) {
      throw new ValidationError('缺少模型ID')
    }
    
    const result = await messageService.clearMessages(modelId)
    
    if (result) {
      res.json({ success: true })
    } else {
      throw new Error('清除消息失败')
    }
  } catch (error) {
    next(error)
  }
}

// 获取消息统计
export async function getMessageStats(req, res, next) {
  try {
    const stats = await messageService.getMessageStats()
    res.json(stats)
  } catch (error) {
    next(error)
  }
} 