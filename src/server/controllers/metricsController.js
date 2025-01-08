import metricsService from '../services/metricsService.js'
import logger from '../utils/logger.js'

// 获取性能指标
export async function getMetrics(req, res, next) {
  try {
    const metrics = await metricsService.getMetrics()
    
    if (metrics) {
      res.json(metrics)
    } else {
      throw new Error('获取性能指标失败')
    }
  } catch (error) {
    next(error)
  }
}

// 重置性能指标
export async function resetMetrics(req, res, next) {
  try {
    const result = await metricsService.resetMetrics()
    
    if (result) {
      res.json({ success: true, message: '性能指标已重置' })
    } else {
      throw new Error('重置性能指标失败')
    }
  } catch (error) {
    next(error)
  }
}

// 记录请求性能
export async function recordRequestMetrics(req, res, responseTime) {
  try {
    await metricsService.recordRequest(req, res, responseTime)
  } catch (error) {
    logger.error('记录请求性能失败:', error)
  }
}

// 记录错误
export async function recordErrorMetrics(error, req) {
  try {
    await metricsService.recordError(error, req)
  } catch (err) {
    logger.error('记录错误指标失败:', err)
  }
} 