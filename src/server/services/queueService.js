import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger.js'

class QueueService {
  constructor() {
    this.tasks = new Map()
    this.subscribers = new Set()
    this.stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
  }

  // 添加任务到队列
  async addTask(taskData) {
    const taskId = uuidv4()
    const task = {
      id: taskId,
      data: taskData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    this.tasks.set(taskId, task)
    this.stats.total++
    this.stats.pending++
    
    logger.info(`任务已添加到队列: ${taskId}`)
    this.notifySubscribers(task)
    
    // 模拟任务处理
    this.processTask(task)
    
    return taskId
  }

  // 获取任务状态
  async getTaskStatus(taskId) {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error('任务不存在')
    }
    return task
  }

  // 获取队列统计信息
  getQueueStats() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString()
    }
  }

  // 处理任务
  async processTask(task) {
    try {
      this.stats.pending--
      this.stats.processing++
      task.status = 'processing'
      task.updatedAt = new Date().toISOString()
      this.notifySubscribers(task)
      
      // 模拟任务处理时间
      const duration = task.data.params?.duration || 1000
      await new Promise(resolve => setTimeout(resolve, duration))
      
      // 根据shouldFail参数决定任务是否失败
      if (task.data.params?.shouldFail) {
        throw new Error('任务执行失败')
      }
      
      task.status = 'completed'
      task.result = {
        message: '任务执行成功',
        completedAt: new Date().toISOString()
      }
      this.stats.processing--
      this.stats.completed++
    } catch (error) {
      task.status = 'failed'
      task.error = error.message
      this.stats.processing--
      this.stats.failed++
    }
    
    task.updatedAt = new Date().toISOString()
    this.notifySubscribers(task)
  }

  // 订阅任务更新
  onTaskUpdated(callback) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  // 取消订阅
  offTaskUpdated(callback) {
    this.subscribers.delete(callback)
  }

  // 通知所有订阅者
  notifySubscribers(task) {
    this.subscribers.forEach(callback => {
      try {
        callback(task)
      } catch (error) {
        logger.error('通知订阅者失败:', error)
      }
    })
  }
}

export default new QueueService() 