const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // 5分钟缓存
const requestQueue = [];
let isProcessing = false;

// 中间件
app.use(cors());
app.use(express.json());

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  timeout: 0,
  headers: {
    'Content-Type': 'application/json'
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  }
});

// 数据库连接池配置
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'chat_history',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// 处理请求队列
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  const { req, res, resolve } = requestQueue.shift();
  
  try {
    const result = await handleChatRequest(req);
    res.json(result);
    resolve();
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: {
        message: error.message,
        response: error.response?.data
      }
    });
    resolve();
  } finally {
    isProcessing = false;
    processQueue();
  }
}

// 处理聊天请求
async function handleChatRequest(req) {
  const cacheKey = JSON.stringify({
    model: req.body.model,
    messages: req.body.input.messages
  });
  
  // 检查缓存
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    console.log('返回缓存的响应');
    return cachedResponse;
  }
  
  const requestBody = {
    model: req.body.model,
    input: {
      messages: [
        { 
          role: "system", 
          content: "你是一个专业的助手，请用通俗易懂的语言回答问题。只输出纯文本内容，不要输出任何代码。如果需要解释技术概念，请用文字描述而不是代码示例。" 
        },
        ...req.body.input.messages
      ]
    },
    parameters: {
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 1500,
      stop: null,
      stream: false,
      result_format: "message"
    }
  };

  try {
    console.log('开始请求 API...');
    const response = await apiClient.post('', requestBody, {
      headers: {
        'Authorization': req.headers.authorization,
        'X-DashScope-AppId': req.headers['x-dashscope-appid']
      }
    });
    console.log('API 请求完成');

    if (response.data?.output?.choices?.[0]) {
      // 缓存响应
      cache.set(cacheKey, response.data);
      return response.data;
    }
    
    throw new Error('API返回结果格式错误');
  } catch (error) {
    console.error('API 请求失败:', error.message);
    throw error;
  }
}

// 代理通义千问 API 请求
app.post('/api/chat', (req, res) => {
  return new Promise((resolve) => {
    requestQueue.push({ req, res, resolve });
    if (!isProcessing) {
      processQueue();
    }
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 保存消息
app.post('/api/messages', async (req, res) => {
  try {
    const { modelId, role, content, timestamp } = req.body;
    const [result] = await pool.promise().execute(
      'INSERT INTO chat_messages (model_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
      [modelId, role, content, new Date(timestamp)]
    );
    res.json({ id: result.insertId });
  } catch (error) {
    console.error('保存消息失败:', error);
    res.status(500).json({ error: '保存消息失败' });
  }
});

// 获取指定模型的消息
app.get('/api/messages/:modelId', async (req, res) => {
  try {
    const [rows] = await pool.promise().execute(
      'SELECT * FROM chat_messages WHERE model_id = ? ORDER BY timestamp ASC',
      [req.params.modelId]
    );
    res.json(rows);
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ error: '获取消息失败' });
  }
});

// 清除指定模型的消息
app.delete('/api/messages/:modelId', async (req, res) => {
  try {
    await pool.promise().execute(
      'DELETE FROM chat_messages WHERE model_id = ?',
      [req.params.modelId]
    );
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('清除消息失败:', error);
    res.status(500).json({ error: '清除消息失败' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 