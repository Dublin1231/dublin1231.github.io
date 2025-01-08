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
const WS_URL = 'ws://localhost:3001'
const API_KEY = process.env.API_KEY

console.log('使用API密钥:', API_KEY)
console.log('API地址:', API_URL)
console.log('WebSocket地址:', WS_URL)

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  // 添加超时设置
  timeout: 5000,
  // 使用IPv4
  proxy: false,
  // 允许跨域
  withCredentials: true
})

// 添加请求拦截器
api.interceptors.request.use(function (config) {
  console.log('发送请求:', {
    method: config.method,
    url: config.url,
    headers: config.headers
  })
  return config
}, function (error) {
  console.error('请求错误:', error)
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
  console.error('响应错误:', {
    status: error.response?.status,
    data: error.response?.data
  })
  return Promise.reject(error)
})

// 模拟项目数据
const projects = [
  {
    name: '电商网站项目',
    description: '开发一个现代化电商平台',
    requirements: [
      '用户注册登录系统',
      '商品管理系统',
      '购物车功能',
      '订单管理系统',
      '支付系统集成'
    ]
  },
  {
    name: '在线教育平台',
    description: '构建一个互动式在线学习平台',
    requirements: [
      '课程管理系统',
      '视频播放功能',
      '作业提交系统',
      '在线考试功能',
      '师生互动系统'
    ]
  },
  {
    name: '智能家居控制系统',
    description: '开发智能家居设备控制平台',
    requirements: [
      '设备连接管理',
      '远程控制功能',
      '自动化场景设置',
      '数据统计分析',
      '警报通知系统'
    ]
  }
]

// 测试健康检查
async function testHealthCheck() {
  try {
    const response = await api.get('/health')
    console.log('健康检查结果:', response.data)
  } catch (error) {
    console.error('健康检查失败:', error.message)
  }
}

// 测试API
async function runTest() {
  console.log('开始测试...')
  
  try {
    // 测试健康检查
    await testHealthCheck()
    
    // 创建WebSocket连接
    console.log('正在连接WebSocket...')
    const ws = new WebSocket(`${WS_URL}?apiKey=${API_KEY}`, {
      // 使用IPv4
      family: 4,
      // 添加超时设置
      handshakeTimeout: 5000,
      // 添加心跳检测
      perMessageDeflate: false
    })
    
    // WebSocket事件处理
    ws.on('open', async () => {
      console.log('WebSocket连接成功')
      
      // 设置心跳响应
      ws.on('ping', () => {
        console.log('收到ping，正在响应pong...')
        ws.pong()
      })
      
      try {
        // 获取初始队列状态
        const statsResponse = await api.get('/api/queue/stats')
        console.log('当前队列状态:', statsResponse.data)
        
        // 添加项目分析任务
        for (const project of projects) {
          try {
            console.log(`\n开始分析项目: ${project.name}`)
            console.log('项目描述:', project.description)
            console.log('项目需求:', project.requirements)
            
            const response = await api.post('/api/tasks', {
              taskData: {
                name: project.name,
                type: 'PROJECT_ANALYSIS',
                params: {
                  description: project.description,
                  requirements: project.requirements
                }
              }
            })
            
            console.log(`项目任务已添加 - ${project.name}:`, response.data)
            
            // 获取任务初始状态
            const taskStatus = await api.get(`/api/tasks/${response.data.taskId}`)
            console.log(`任务初始状态 - ${project.name}:`, taskStatus.data)
            
            // 等待2秒再添加下一个项目
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (error) {
            console.error(`项目分析失败 - ${project.name}:`, error.message)
          }
        }
        
        // 获取最终队列状态
        const finalStats = await api.get('/api/queue/stats')
        console.log('\n最终队列状态:', finalStats.data)
        
      } catch (error) {
        console.error('测试执行失败:', error.message)
      }
    })
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data)
        
        switch (message.type) {
          case 'taskUpdate':
            const task = message.data
            console.log(`\n项目状态更新 - ${task.data.name}:`, {
              状态: task.status,
              结果: task.result,
              错误: task.error
            })
            break
            
          case 'queueStats':
            console.log('\n队列状态更新:', message.data)
            break
            
          default:
            console.log('\n收到其他消息:', message)
        }
      } catch (error) {
        console.error('处理消息失败:', error)
      }
    })
    
    ws.on('error', (error) => {
      console.error('WebSocket错误:', error)
      // 尝试重新连接
      setTimeout(() => {
        console.log('尝试重新连接...')
        runTest()
      }, 5000)
    })
    
    ws.on('close', (code, reason) => {
      console.log('WebSocket连接关闭:', { 
        code, 
        reason: reason.toString(),
        说明: code === 1000 ? '正常关闭' :
             code === 1006 ? '异常关闭' :
             code === 1001 ? '服务端关闭' :
             '其他原因'
      })
      
      // 如果是异常关闭，尝试重新连接
      if (code === 1006) {
        setTimeout(() => {
          console.log('尝试重新连接...')
          runTest()
        }, 5000)
      }
    })
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
runTest()

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭...')
  process.exit(0)
}) 