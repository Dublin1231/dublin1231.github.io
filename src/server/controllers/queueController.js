import queueManager from '../services/queueManager.js';
import cacheManager from '../services/cacheManager.js';
import { apiConfig } from '../config/api.config.js';

class QueueController {
  // 添加任务到队列
  async addTask(req, res) {
    try {
      const task = {
        ip: req.ip,
        model: req.body.model,
        data: req.body,
        execute: async () => {
          return await this.makeStreamingRequest(req.body);
        }
      };
      
      const taskId = await queueManager.addToQueue(task);
      res.json({ taskId, status: 'queued' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 获取任务状态
  async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const status = await queueManager.getTaskStatus(taskId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 获取队列统计信息
  async getQueueStats(req, res) {
    try {
      const stats = await queueManager.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 处理 WebSocket 连接
  async handleWebSocket(ws, req) {
    try {
      // WebSocket 连接处理逻辑
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          const result = await this.handleChatRequest(data);
          ws.send(JSON.stringify(result));
        } catch (error) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });
    } catch (error) {
      ws.send(JSON.stringify({ error: error.message }));
    }
  }

  async handleChatRequest(req, res) {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
      // 生成缓存键
      const cacheKey = cacheManager.generateCacheKey({
        model: req.body.model,
        input: req.body.input.messages,
        options: req.body.options
      });

      // 尝试从缓存获取结果
      const cachedResult = await cacheManager.get(cacheKey);
      if (cachedResult) {
        // 设置响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Cache-Hit', 'true');

        // 模拟流式返回缓存的结果
        const chunks = this.splitResponseIntoChunks(cachedResult);
        for (const chunk of chunks) {
          if (res.writableEnded) break;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          // 添加小延迟模拟流式响应
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        res.end();
        return;
      }

      const task = {
        ip,
        model: req.body.model,
        execute: async () => {
          // 这里是实际的 API 调用逻辑
          const response = await this.makeStreamingRequest(req.body);
          return response;
        }
      };

      // 添加到队列并等待结果
      const result = await queueManager.addToQueue(task);
      
      // 设置响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Cache-Hit', 'false');
      
      // 收集完整响应用于缓存
      let fullResponse = [];
      
      // 发送数据流
      for await (const chunk of result) {
        if (res.writableEnded) break;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        fullResponse.push(chunk);
      }
      
      // 缓存完整响应
      if (fullResponse.length > 0) {
        await cacheManager.set(cacheKey, fullResponse, {
          ttl: this.calculateCacheTTL(fullResponse)
        });
      }
      
      res.end();
      
    } catch (error) {
      console.error('处理聊天请求错误:', error);
      
      if (!res.headersSent) {
        res.status(error.status || 500).json({
          error: error.message || '服务器内部错误',
          retryAfter: error.retryAfter || apiConfig.errors.retryDelay
        });
      }
    }
  }

  // 将响应分割成小块
  splitResponseIntoChunks(response, chunkSize = 100) {
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;

    for (const item of response) {
      currentChunk.push(item);
      currentSize += JSON.stringify(item).length;

      if (currentSize >= chunkSize) {
        chunks.push([...currentChunk]);
        currentChunk = [];
        currentSize = 0;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // 计算缓存时间
  calculateCacheTTL(response) {
    // 根据响应大小和复杂度动态计算缓存时间
    const responseSize = JSON.stringify(response).length;
    const baseTime = apiConfig.cache.levels.l2.ttl;
    
    if (responseSize > 100000) {  // 大响应缓存更久
      return baseTime * 2;
    } else if (responseSize < 1000) {  // 小响应缓存时间短一些
      return baseTime / 2;
    }
    return baseTime;
  }

  async makeStreamingRequest(requestData) {
    // 实现流式请求的生成器函数
    async function* streamResponse(data) {
      try {
        // 这里实现实际的 API 调用和流式响应处理
        // 示例：每个响应块都yield出去
        for (const chunk of data) {
          yield {
            output: {
              choices: [{
                message: {
                  content: chunk
                }
              }]
            }
          };
          
          // 模拟流式响应的延迟
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('流式请求错误:', error);
        throw error;
      }
    }

    return streamResponse(requestData);
  }
}

// 导出实例
export const queueController = new QueueController();
export const { addTask, getTaskStatus, getQueueStats, handleWebSocket } = queueController; 