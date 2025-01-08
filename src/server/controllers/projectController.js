import { analyzeWithAI } from '../services/aiService.js'
import NodeCache from 'node-cache'
import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'

// 限流配置
const rateLimiter = {
  windowMs: 60 * 1000, // 1分钟时间窗口
  maxRequests: 10, // 每个时间窗口最大请求数
  currentRequests: 0,
  lastReset: Date.now(),
  queue: [], // 等待队列
  maxQueueSize: 50, // 最大队列长度
  concurrentLimit: 3, // 最大并发数
  currentConcurrent: 0
}

// 检查并重置限流计数器
function checkAndResetRateLimit() {
  const now = Date.now()
  if (now - rateLimiter.lastReset >= rateLimiter.windowMs) {
    rateLimiter.currentRequests = 0
    rateLimiter.lastReset = now
    processQueue() // 处理等待队列
  }
}

// 处理等待队列
async function processQueue() {
  while (
    rateLimiter.queue.length > 0 && 
    rateLimiter.currentRequests < rateLimiter.maxRequests &&
    rateLimiter.currentConcurrent < rateLimiter.concurrentLimit
  ) {
    const { resolve } = rateLimiter.queue.shift()
    rateLimiter.currentRequests++
    rateLimiter.currentConcurrent++
    resolve()
  }
}

// 限流检查
async function checkRateLimit() {
  return new Promise((resolve, reject) => {
    checkAndResetRateLimit()
    
    if (
      rateLimiter.currentRequests < rateLimiter.maxRequests &&
      rateLimiter.currentConcurrent < rateLimiter.concurrentLimit
    ) {
      rateLimiter.currentRequests++
      rateLimiter.currentConcurrent++
      resolve()
    } else if (rateLimiter.queue.length < rateLimiter.maxQueueSize) {
      rateLimiter.queue.push({ resolve, timestamp: Date.now() })
    } else {
      reject(new Error('服务器繁忙，请稍后重试'))
    }
  })
}

// 释放并发计数
function releaseConcurrent() {
  rateLimiter.currentConcurrent--
  processQueue()
}

// 性能监控数据
const performanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  totalResponseTime: 0
}

// 创建事件发射器用于异步通知
const eventEmitter = new EventEmitter()

// 创建缓存实例，设置缓存时间为1小时
const cache = new NodeCache({ 
  stdTTL: 3600,
  checkperiod: 120,
  useClones: false
})

// 任务队列
const taskQueue = new Map()

// 任务状态枚举
const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

// 记录请求日志
function logRequest(req, status, duration, error = null) {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status,
    duration: `${duration.toFixed(2)}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }
  
  if (error) {
    log.error = {
      message: error.message,
      stack: error.stack
    }
  }
  
  console.log('请求日志:', JSON.stringify(log, null, 2))
}

// 更新性能指标
function updatePerformanceMetrics(duration, isSuccess, isCacheHit) {
  performanceMetrics.totalRequests++
  performanceMetrics.totalResponseTime += duration
  performanceMetrics.averageResponseTime = 
    performanceMetrics.totalResponseTime / performanceMetrics.totalRequests
  
  if (isSuccess) {
    performanceMetrics.successfulRequests++
  } else {
    performanceMetrics.failedRequests++
  }
  
  if (isCacheHit) {
    performanceMetrics.cacheHits++
  } else {
    performanceMetrics.cacheMisses++
  }
}

export const analyzeProject = async (req, res) => {
  const startTime = performance.now()
  let success = false
  let isCacheHit = false
  
  try {
    // 限流检查
    await checkRateLimit()
    
    const { prompt } = req.body
    console.log('收到分析请求:', prompt)
    
    // 生成缓存key
    const cacheKey = JSON.stringify({
      prompt,
      type: analyzeProjectType(prompt)
    })
    
    // 检查缓存
    const cachedResult = cache.get(cacheKey)
    if (cachedResult) {
      console.log('返回缓存的分析结果')
      isCacheHit = true
      success = true
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration, success, isCacheHit)
      logRequest(req, 200, duration)
      return res.json({ 
        guide: cachedResult,
        fromCache: true,
        status: TaskStatus.COMPLETED
      })
    }

    // 检查是否有相同的任务正在处理
    if (taskQueue.has(cacheKey)) {
      console.log('相同的请求正在处理中，等待结果...')
      const taskId = Math.random().toString(36).substring(7)
      
      // 返回任务ID给客户端
      const duration = performance.now() - startTime
      success = true
      updatePerformanceMetrics(duration, success, isCacheHit)
      logRequest(req, 202, duration)
      
      res.json({
        taskId,
        status: TaskStatus.PROCESSING,
        message: '请求正在处理中，请稍后查询结果'
      })

      // 监听��务完成事件
      eventEmitter.once(`task_complete_${cacheKey}_${taskId}`, (result) => {
        console.log('任务完成，通知客户端')
        const completionDuration = performance.now() - startTime
        logRequest(req, 200, completionDuration)
        res.json({
          guide: result,
          status: TaskStatus.COMPLETED
        })
      })
      
      return
    }

    // 将任务添加到队列
    const taskId = Math.random().toString(36).substring(7)
    taskQueue.set(cacheKey, {
      id: taskId,
      status: TaskStatus.PENDING,
      timestamp: Date.now(),
      startTime
    })
    
    // 项目类型分析
    const projectType = analyzeProjectType(prompt)
    console.log('识别的项目类型:', projectType)
    
    // 更新任务状态
    taskQueue.get(cacheKey).status = TaskStatus.PROCESSING
    
    // 使用 AI 分析生成详细建议
    const analysis = await analyzeWithAI(prompt, projectType)
    console.log('AI分析完成')
    
    // 缓存结果
    cache.set(cacheKey, analysis)
    
    // 更新任务状态
    taskQueue.get(cacheKey).status = TaskStatus.COMPLETED
    
    // 通知所有等待此结果的客户端
    eventEmitter.emit(`task_complete_${cacheKey}`, analysis)
    
    // 从队列中移除任务
    setTimeout(() => {
      taskQueue.delete(cacheKey)
    }, 5000) // 5秒后清理任务记录
    
    success = true
    const duration = performance.now() - startTime
    updatePerformanceMetrics(duration, success, isCacheHit)
    logRequest(req, 200, duration)
    
    res.json({ 
      guide: analysis,
      status: TaskStatus.COMPLETED,
      taskId
    })
  } catch (error) {
    console.error('项目分析失败:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    })
    
    // 更新任务状态为失败
    if (taskQueue.has(cacheKey)) {
      taskQueue.get(cacheKey).status = TaskStatus.FAILED
      setTimeout(() => {
        taskQueue.delete(cacheKey)
      }, 5000)
    }
    
    const duration = performance.now() - startTime
    updatePerformanceMetrics(duration, success, isCacheHit)
    logRequest(req, error.message === '服务器繁忙，请稍后重试' ? 429 : 500, duration, error)
    
    res.status(error.message === '服务器繁忙，请稍后重试' ? 429 : 500).json({ 
      error: error.message,
      details: error.message,
      status: TaskStatus.FAILED
    })
  } finally {
    releaseConcurrent()
  }
}

// 获取性能指标
export const getPerformanceMetrics = (req, res) => {
  res.json({
    ...performanceMetrics,
    currentQueueSize: taskQueue.size,
    cacheSize: cache.getStats().keys,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  })
}

// 获取任务状态
export const getTaskStatus = async (req, res) => {
  const startTime = performance.now()
  let success = false
  let isCacheHit = false
  
  try {
    const { taskId } = req.params
    const { cacheKey } = req.query
    
    // 检查缓存是否已有结果
    const cachedResult = cache.get(cacheKey)
    if (cachedResult) {
      success = true
      isCacheHit = true
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration, success, isCacheHit)
      logRequest(req, 200, duration)
      
      return res.json({
        guide: cachedResult,
        status: TaskStatus.COMPLETED,
        fromCache: true
      })
    }
    
    // 检查任务是否还在队列中
    const task = Array.from(taskQueue.values()).find(t => t.id === taskId)
    if (task) {
      success = true
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration, success, isCacheHit)
      logRequest(req, 200, duration)
      
      return res.json({
        taskId,
        status: task.status,
        message: getStatusMessage(task.status),
        timestamp: task.timestamp,
        duration: performance.now() - task.startTime
      })
    }
    
    // 任务不存在
    const duration = performance.now() - startTime
    updatePerformanceMetrics(duration, false, isCacheHit)
    logRequest(req, 404, duration)
    
    res.status(404).json({
      error: '任务不存在或已过期',
      taskId
    })
  } catch (error) {
    const duration = performance.now() - startTime
    updatePerformanceMetrics(duration, false, isCacheHit)
    logRequest(req, 500, duration, error)
    
    res.status(500).json({
      error: '获取任务状态失败',
      details: error.message
    })
  }
}

// 获取状态描述
function getStatusMessage(status) {
  switch (status) {
    case TaskStatus.PENDING:
      return '任务等待处理中'
    case TaskStatus.PROCESSING:
      return '任务正在处理中'
    case TaskStatus.COMPLETED:
      return '任务已完成'
    case TaskStatus.FAILED:
      return '任务处理失败'
    default:
      return '未知状态'
  }
}

function analyzeProjectType(prompt) {
  const keywords = {
    frontend: ['前端', 'vue', 'react', 'angular', 'ui', 'ux', '界面', '交互'],
    backend: ['后端', 'api', '服务器', '数据库', 'node', 'express', '接口'],
    desktop: ['桌面', 'windows', 'win10', '客户端', '可执行程序'],
    mobile: ['移动端', 'app', '手机', 'ios', 'android']
  }
  
  const types = []
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => prompt.toLowerCase().includes(word))) {
      types.push(type)
    }
  }
  
  return types.length ? types : ['unknown']
}

// 批量分析项目
export const analyzeBatchProjects = async (req, res) => {
  const startTime = performance.now()
  let success = false
  
  try {
    // 限流检查
    await checkRateLimit()
    
    const { prompts } = req.body
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('请提供有效的项目需求数组')
    }
    
    if (prompts.length > 10) {
      throw new Error('批量请求最多支持10个项目')
    }
    
    console.log(`收到批量分析请求，共 ${prompts.length} 个项目`)
    
    // 创建批处理任务ID
    const batchId = Math.random().toString(36).substring(7)
    const results = []
    const errors = []
    
    // 并行处理所有请求
    const analysisPromises = prompts.map(async (prompt, index) => {
      try {
        // 生成缓存key
        const cacheKey = JSON.stringify({
          prompt,
          type: analyzeProjectType(prompt)
        })
        
        // 检查缓存
        const cachedResult = cache.get(cacheKey)
        if (cachedResult) {
          console.log(`项目 ${index + 1} 使用缓存结果`)
          results[index] = {
            prompt,
            guide: cachedResult,
            fromCache: true
          }
          return
        }
        
        // 项目类型分析
        const projectType = analyzeProjectType(prompt)
        console.log(`项目 ${index + 1} 类型:`, projectType)
        
        // 使用 AI 分析
        const analysis = await analyzeWithAI(prompt, projectType)
        
        // 缓存结果
        cache.set(cacheKey, analysis)
        
        results[index] = {
          prompt,
          guide: analysis,
          fromCache: false
        }
        
      } catch (error) {
        console.error(`项目 ${index + 1} 分析失败:`, error)
        errors.push({
          index,
          prompt,
          error: error.message
        })
        results[index] = {
          prompt,
          error: error.message,
          status: 'failed'
        }
      }
    })
    
    // 等待所有分析完成
    await Promise.all(analysisPromises)
    
    success = errors.length < prompts.length
    const duration = performance.now() - startTime
    updatePerformanceMetrics(duration, success, false)
    logRequest(req, 200, duration)
    
    res.json({
      batchId,
      totalProjects: prompts.length,
      successCount: prompts.length - errors.length,
      errorCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      duration: `${duration.toFixed(2)}ms`
    })
    
  } catch (error) {
    console.error('批量分析失败:', error)
    const duration = performance.now() - startTime
    updatePerformanceMetrics(duration, false, false)
    logRequest(req, error.message === '服务器繁忙，请稍后重试' ? 429 : 500, duration, error)
    
    res.status(error.message === '服务器繁忙，请稍后重试' ? 429 : 500).json({
      error: error.message,
      details: error.message
    })
  } finally {
    releaseConcurrent()
  }
}

// 获取限流状态
export const getRateLimitStatus = (req, res) => {
  checkAndResetRateLimit()
  
  res.json({
    currentRequests: rateLimiter.currentRequests,
    maxRequests: rateLimiter.maxRequests,
    windowMs: rateLimiter.windowMs,
    queueLength: rateLimiter.queue.length,
    maxQueueSize: rateLimiter.maxQueueSize,
    currentConcurrent: rateLimiter.currentConcurrent,
    concurrentLimit: rateLimiter.concurrentLimit,
    nextReset: new Date(rateLimiter.lastReset + rateLimiter.windowMs).toISOString()
  })
} 