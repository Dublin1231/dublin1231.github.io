import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

// 定义日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
}

// 根据环境设置日志级别
const level = () => {
  const env = process.env.NODE_ENV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'warn'
}

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
)

// 定义传输方式
const transports = [
  // 控制台输出
  new winston.transports.Console(),
  
  // 错误日志文件
  new DailyRotateFile({
    filename: join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error'
  }),
  
  // 所有日志文件
  new DailyRotateFile({
    filename: join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  })
]

// 创建日志记录器
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports
})

// 添加颜色支持
winston.addColors(colors)

// 请求日志格式化
export const logRequest = (req, res, responseTime) => {
  const { method, url, ip, headers } = req
  const userAgent = headers['user-agent']
  const statusCode = res.statusCode
  
  const message = `${method} ${url} ${statusCode} ${responseTime}ms - ${ip} - ${userAgent}`
  
  if (statusCode >= 500) {
    logger.error(message)
  } else if (statusCode >= 400) {
    logger.warn(message)
  } else {
    logger.http(message)
  }
}

// 错误日志格式化
export const logError = (error, req) => {
  const { name, message, stack } = error
  const { method, url, ip } = req
  
  logger.error(`
    Error: ${name}
    Message: ${message}
    Stack: ${stack}
    Method: ${method}
    URL: ${url}
    IP: ${ip}
  `)
}

// 性能日志格���化
export const logPerformance = (metric) => {
  const { name, value, tags } = metric
  logger.info(`Performance: ${name} = ${value}ms ${JSON.stringify(tags)}`)
}

// 安全日志格式化
export const logSecurity = (event) => {
  const { type, message, ip } = event
  logger.warn(`Security: ${type} - ${message} - IP: ${ip}`)
}

export default logger 