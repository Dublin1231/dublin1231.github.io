import NodeCache from 'node-cache'
import logger from '../utils/logger.js'

// 创建性能指标缓存实例
const metricsCache = new NodeCache({
  stdTTL: 24 * 60 * 60, // 24小时过期
  checkperiod: 60 * 60, // 每小时检查过期
  useClones: false
})

// 初始化性能指标
const initMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  minResponseTime: Number.MAX_VALUE,
  requestsPerMinute: 0,
  lastMinuteRequests: [],
  statusCodes: {},
  endpoints: {},
  errors: {},
  lastUpdated: new Date().toISOString()
}

// 确保指标存在
if (!metricsCache.has('metrics')) {
  metricsCache.set('metrics', initMetrics)
}

class MetricsService {
  // 记录请求
  async recordRequest(req, res, responseTime) {
    try {
      const metrics = metricsCache.get('metrics')
      const timestamp = Date.now()
      
      // 更新总请求数
      metrics.totalRequests++
      
      // 更新响应状态
      if (res.statusCode < 400) {
        metrics.successfulRequests++
      } else {
        metrics.failedRequests++
      }
      
      // 更新响应时间统计
      metrics.totalResponseTime += responseTime
      metrics.averageResponseTime = metrics.totalResponseTime / metrics.totalRequests
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime)
      metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime)
      
      // 更新状态码统计
      metrics.statusCodes[res.statusCode] = (metrics.statusCodes[res.statusCode] || 0) + 1
      
      // 更新端点统计
      const endpoint = `${req.method} ${req.path}`
      metrics.endpoints[endpoint] = metrics.endpoints[endpoint] || {
        count: 0,
        totalTime: 0,
        averageTime: 0
      }
      metrics.endpoints[endpoint].count++
      metrics.endpoints[endpoint].totalTime += responseTime
      metrics.endpoints[endpoint].averageTime = 
        metrics.endpoints[endpoint].totalTime / metrics.endpoints[endpoint].count
      
      // 更新每分钟请求数
      metrics.lastMinuteRequests = metrics.lastMinuteRequests
        .filter(req => req > timestamp - 60000)
      metrics.lastMinuteRequests.push(timestamp)
      metrics.requestsPerMinute = metrics.lastMinuteRequests.length
      
      // 更新最后更新时间
      metrics.lastUpdated = new Date().toISOString()
      
      // 保存更新后的指标
      metricsCache.set('metrics', metrics)
      
      logger.info(`性能指标已更新 - 响应时间: ${responseTime}ms, 状态码: ${res.statusCode}`)
    } catch (error) {
      logger.error('记录性能指标失败:', error)
    }
  }
  
  // 记录错误
  async recordError(error, req) {
    try {
      const metrics = metricsCache.get('metrics')
      const errorKey = `${error.name}: ${error.message}`
      
      metrics.errors[errorKey] = metrics.errors[errorKey] || {
        count: 0,
        lastOccurred: null,
        endpoints: {}
      }
      
      metrics.errors[errorKey].count++
      metrics.errors[errorKey].lastOccurred = new Date().toISOString()
      
      const endpoint = `${req.method} ${req.path}`
      metrics.errors[errorKey].endpoints[endpoint] = 
        (metrics.errors[errorKey].endpoints[endpoint] || 0) + 1
      
      metricsCache.set('metrics', metrics)
      
      logger.error(`错误已记录 - ${errorKey}`)
    } catch (error) {
      logger.error('记录错误指标失败:', error)
    }
  }
  
  // 获取性能指标
  async getMetrics() {
    try {
      const metrics = metricsCache.get('metrics')
      return {
        ...metrics,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    } catch (error) {
      logger.error('获取性能指标失败:', error)
      return null
    }
  }
  
  // 重置性能指标
  async resetMetrics() {
    try {
      metricsCache.set('metrics', initMetrics)
      logger.info('性能指标已重置')
      return true
    } catch (error) {
      logger.error('重置性能指标失败:', error)
      return false
    }
  }
}

export default new MetricsService() 