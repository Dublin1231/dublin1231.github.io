import { UnauthorizedError } from '../utils/errors.js'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

// API密钥验证中间件
export function validateApiKey(req, res, next) {
  try {
    // 从不同位置获取API密钥
    const authHeader = req.headers.authorization
    const apiKeyHeader = req.headers['x-api-key']
    
    // 提取Bearer token
    const bearerToken = authHeader ? authHeader.split(' ')[1] : null
    
    // 获取实际的API密钥
    const providedApiKey = bearerToken || apiKeyHeader
    
    // 从环境变量获取预期的API密钥
    const expectedApiKey = process.env.API_KEY
    
    // 打印详细的调试信息
    console.log('API密钥验证详情:', {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 15)}...` : null,
      hasApiKeyHeader: !!apiKeyHeader,
      apiKeyHeader: apiKeyHeader ? `${apiKeyHeader.substring(0, 15)}...` : null,
      hasBearerToken: !!bearerToken,
      providedApiKey: providedApiKey ? `${providedApiKey.substring(0, 15)}...` : null,
      expectedApiKey: expectedApiKey ? `${expectedApiKey.substring(0, 15)}...` : null
    })
    
    if (!providedApiKey) {
      console.log('缺少API密钥')
      return res.status(401).json({
        error: '缺少API密钥',
        details: '请在请求头中提供API密钥',
        path: req.path,
        timestamp: new Date().toISOString()
      })
    }
    
    if (!expectedApiKey) {
      console.log('服务器未配置API密钥')
      return res.status(500).json({
        error: '服务器配置错误',
        details: '服务器未正确配置API密钥',
        path: req.path,
        timestamp: new Date().toISOString()
      })
    }
    
    if (providedApiKey !== expectedApiKey) {
      console.log('API密钥不匹配')
      return res.status(401).json({
        error: 'API密钥无效',
        details: '提供的API密钥不正确',
        path: req.path,
        timestamp: new Date().toISOString()
      })
    }
    
    console.log('API密钥验证成功')
    next()
  } catch (error) {
    console.error('API密钥验证失败:', error)
    res.status(401).json({
      error: '认证失败',
      details: error.message,
      path: req.path,
      timestamp: new Date().toISOString()
    })
  }
}

// IP白名单中间件
export function ipWhitelist(req, res, next) {
  const allowedIPs = ['127.0.0.1', '::1', 'localhost']
  const clientIP = req.ip
  
  if (allowedIPs.includes(clientIP)) {
    return next()
  }
  
  throw new UnauthorizedError('IP地址未授权')
}

// 速率限制中间件
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100个请求
  message: '请求过于频繁，请稍后再试'
})

// 安全头部中间件
export const securityHeaders = helmet()

// 输入净化中间件
export function sanitizeInput(req, res, next) {
  // 简单的XSS防护
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      }
    }
  }
  next()
}

// SQL注入防护中间件
export function sqlInjectionProtection(req, res, next) {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i
  
  const checkValue = (value) => {
    if (typeof value === 'string' && sqlPattern.test(value)) {
      throw new UnauthorizedError('检测到潜在的SQL注入攻击')
    }
  }
  
  if (req.body) {
    for (let key in req.body) {
      checkValue(req.body[key])
    }
  }
  
  if (req.query) {
    for (let key in req.query) {
      checkValue(req.query[key])
    }
  }
  
  next()
}

// 请求大小限制
export const requestSizeLimit = {
  json: {
    limit: '1mb'
  },
  urlencoded: {
    limit: '1mb',
    extended: true
  }
}

// 超时中间件
export function timeout(time) {
  return (req, res, next) => {
    res.setTimeout(time, () => {
      res.status(408).json({
        error: '请求超时',
        timeout: time
      })
    })
    next()
  }
} 