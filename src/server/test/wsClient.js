import WebSocket from 'ws'
import axios from 'axios'
import logger from '../utils/logger.js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
const envPath = join(__dirname, '../../../.env')
console.log('加载环境变量文件:', envPath)
const result = config({ path: envPath })

if (result.error) {
  console.error('加载环境变量失败:', result.error)
  process.exit(1)
}

const API_URL = 'http://localhost:3001'
const API_KEY = process.env.API_KEY

console.log('使用API密钥:', API_KEY)

// 创建axios实例
const api = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 添加请求拦截器
api.interceptors.request.use(function (config) {
  // 在发送请求之前添加API密钥
  config.headers = config.headers || {}
  config.headers['X-API-Key'] = API_KEY
  console.log('发送请求:', {
    method: config.method,
    url: config.url,
    headers: config.headers
  })
  return config
}, function (error) {
  return Promise.reject(error)
})

// 添加响应拦截器
api.interceptors.response.use(function (response) {
  console.log('收到响应:', {
    status: response.status,
    data: response.data
  })
  return response
}, function (error) {
  console.error('请求错误:', {
    status: error.response?.status,
    data: error.response?.data
  })
  return Promise.reject(error)
})

// 创建WebSocket客户端
logger.info('正在创建WebSocket连接...', {
  url: `ws://127.0.0.1:3001?apiKey=${API_KEY}`,
  headers: {
    'X-API-Key': API_KEY
  }
})

const ws = new WebSocket(`ws://127.0.0.1:3001?apiKey=${API_KEY}`, {
  // 使用IPv4
  family: 4,
  // 添加超时设置
  handshakeTimeout: 5000,
  // 禁用压缩
  perMessageDeflate: false,
  // 添加请求头
  headers: {
    'X-API-Key': API_KEY
  }
})

// 连接打开前
ws.on('connecting', () => {
  logger.info('正在连接到WebSocket服务器...')
})

// 测试用例
const testCases = [
  {
    name: '快速任务',
    duration: 1000,
    shouldFail: false
  },
  {
    name: '中等任务',
    duration: 3000,
    shouldFail: false
  },
  {
    name: '慢速任务',
    duration: 5000,
    shouldFail: false
  },
  {
    name: '失败任务',
    duration: 1000,
    shouldFail: true
  }
]

// 连接成功
ws.on('open', async () => {
  logger.info('已连接到WebSocket服务器')
  
  try {
    // 发送测试消息
    const testMessage = {
      type: 'test',
      data: {
        message: 'Hello Server!',
        apiKey: API_KEY
      }
    }
    logger.info('发送测试消息:', testMessage)
    ws.send(JSON.stringify(testMessage))
    
    try {
      // 获取初始队列统计
      logger.info('正在请求队列统计...')
      const statsResponse = await api.get('/api/queue/stats', {
        headers: {
          'X-API-Key': API_KEY
        }
      })
      logger.info('队列统计响应:', statsResponse.data)
    } catch (error) {
      logger.error('获取队列统计失败:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      })
    }
    
    // 依次添加测试任务
    for (const testCase of testCases) {
      try {
        logger.info(`准备添加任务 - ${testCase.name}`)
        const response = await api.post('/api/tasks', {
          taskData: {
            name: testCase.name,
            type: 'TEST',
            process: true,
            params: {
              duration: testCase.duration,
              shouldFail: testCase.shouldFail
            }
          }
        })
        
        logger.info(`任务已添加 - ${testCase.name}:`, response.data)
        
        // 获取任务状态
        const taskStatus = await api.get(`/api/tasks/${response.data.taskId}`)
        logger.info(`任务状态 - ${testCase.name}:`, taskStatus.data)
      } catch (error) {
        logger.error(`添加任务失败 - ${testCase.name}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        })
      }
      
      // 等待一段时间再添加下一个任务
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } catch (error) {
    logger.error('测试执行失败:', {
      message: error.message,
      stack: error.stack
    })
  }
})

// 接收消息
ws.on('message', (data) => {
  try {
    logger.info('收到原始消息:', data.toString())
    const message = JSON.parse(data)
    
    // 处理不同类型的消息
    switch (message.type) {
      case 'connection':
        logger.info('收到连接确认:', message.data)
        break
      case 'taskUpdate':
        logger.info(`任务更新 - ${message.data.data?.name || 'unknown'}:`, {
          id: message.data.id,
          status: message.data.status,
          result: message.data.result,
          error: message.data.error
        })
        break
      case 'queueStats':
        logger.info('队列统计更新:', message.data)
        break
      default:
        logger.info('未知消息类型:', message)
    }
  } catch (error) {
    logger.error('处理消息失败:', error)
  }
})

// 连接错误
ws.on('error', (error) => {
  logger.error('WebSocket错误:', {
    message: error.message,
    code: error.code,
    type: error.type,
    target: error.target
  })
  
  // 尝试重新连接
  setTimeout(() => {
    logger.info('尝试重新连接...')
    process.exit(1) // 退出进程，让 PM2 重启
  }, 5000)
})

// 连接关闭
ws.on('close', (code, reason) => {
  logger.info('WebSocket连接已关闭:', {
    code,
    reason: reason.toString(),
    说明: code === 1000 ? '正常关闭' :
         code === 1006 ? '异常关闭' :
         code === 1001 ? '服务端关闭' :
         code === 1002 ? '协议错误' :
         code === 1003 ? '数据类型错误' :
         code === 1007 ? '数据无效' :
         code === 1008 ? '策略违规' :
         code === 1009 ? '消息过大' :
         code === 1010 ? '需要扩展' :
         code === 1011 ? '服务器错误' :
         code === 1012 ? '服务重启' :
         code === 1013 ? '临时错误' :
         code === 1014 ? '负载过重' :
         code === 1015 ? 'TLS握手失败' :
         '其他原因'
  })
  
  // 如果是异常关闭，尝试重新连接
  if (code === 1006) {
    setTimeout(() => {
      logger.info('尝试重新连接...')
      process.exit(1) // 退出进程，让 PM2 重启
    }, 5000)
  }
})

// 进程退出时清理
process.on('SIGINT', () => {
  logger.info('正在关闭WebSocket连接...')
  ws.close()
  process.exit(0)
}) 