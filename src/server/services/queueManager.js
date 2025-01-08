import { apiConfig } from '../config/api.config.js';
import * as Queue from 'better-queue';

class QueueManager {
  constructor() {
    this.queue = new Queue.default(async (task, cb) => {
      try {
        // 检查系统资源
        if (this.isSystemOverloaded()) {
          throw new Error('系统资源不足，请稍后重试');
        }

        // 检查任务类型
        if (task.model === 'qwen-long') {
          // 长文本模型特殊处理
          const result = await this.processLongTextTask(task);
          cb(null, result);
        } else {
          // 普通任务处理
          const result = await this.processTask(task);
          cb(null, result);
        }
      } catch (error) {
        cb(error);
      }
    }, {
      concurrent: apiConfig.queue.concurrency,
      maxTimeout: apiConfig.queue.timeout,
      maxRetries: apiConfig.queue.retryCount,
      retryDelay: apiConfig.queue.retryDelay,
      maxSize: apiConfig.queue.maxSize
    });

    // 初始化计数器和监控
    this.initializeMonitoring();
  }

  // 初始化监控
  initializeMonitoring() {
    this.ipRequestCounts = new Map();
    this.errorCounts = new Map();
    this.resourceUsage = {
      memory: 0,
      cpu: 0,
      lastCheck: Date.now()
    };

    // 定期重置计数器
    setInterval(() => this.resetCounters(), apiConfig.concurrency.windowMs);
    
    // 监控系统资源
    this.startResourceMonitoring();
  }

  // 处理长文本任务
  async processLongTextTask(task) {
    const modelConfig = apiConfig.modelConfig['qwen-long'];
    const startTime = Date.now();
    let currentTry = 0;

    // 估算处理时间
    const estimatedTokens = Math.ceil(task.input.length / 4); // 粗略估算token数
    const estimatedTime = estimatedTokens * modelConfig.timeoutPerToken;
    
    // 如果估算时间超过最大处理时间，拒绝请求
    if (estimatedTime > modelConfig.maxProcessingTime) {
      throw new Error('文本过长，预计处理时间超过限制');
    }

    while (currentTry < apiConfig.errors.maxRetries) {
      try {
        // 检查是否超时
        if (Date.now() - startTime > modelConfig.maxProcessingTime) {
          throw new Error('处理超时');
        }

        // 分块处理长文本
        const chunks = this.splitIntoChunks(task.input, modelConfig.chunkSize, modelConfig.chunkOverlap);
        const results = [];

        for (const chunk of chunks) {
          // 处理每个块
          const result = await this.processChunk(chunk, task);
          results.push(result);

          // 检查是否需要限流
          if (this.shouldThrottle()) {
            await this.delay(apiConfig.queue.chunkDelay);
          }
        }

        // 合并结果
        return this.mergeResults(results);

      } catch (error) {
        currentTry++;
        
        if (this.shouldRetry(error) && currentTry < apiConfig.errors.maxRetries) {
          await this.delay(apiConfig.errors.retryDelay * currentTry);
          continue;
        }
        
        throw error;
      }
    }
  }

  // 分块处理
  splitIntoChunks(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }

  // 处理单个数据块
  async processChunk(chunk, task) {
    const chunkTask = {
      ...task,
      input: chunk
    };

    return await this.processTask(chunkTask);
  }

  // 合并结果
  mergeResults(results) {
    return results.join('');
  }

  // 检查是否需要限流
  shouldThrottle() {
    return this.resourceUsage.memory > parseFloat(apiConfig.resources.cooldownThreshold) ||
           this.resourceUsage.cpu > parseFloat(apiConfig.resources.cooldownThreshold);
  }

  // 重置计数器
  resetCounters() {
    this.ipRequestCounts.clear();
    this.errorCounts.clear();
  }

  // 更新错误计数
  updateErrorCount(ip) {
    const count = this.errorCounts.get(ip) || 0;
    this.errorCounts.set(ip, count + 1);
    
    // 如果错误次数过多，实施更严格的限制
    if (count >= apiConfig.errors.errorThreshold) {
      this.ipRequestCounts.set(ip, apiConfig.concurrency.maxRequestsPerIP);
    }
  }

  // 添加任务到队列
  async addToQueue(task) {
    const ip = task.ip;
    
    // 检查 IP 请求限制
    if (this.isIpLimited(ip)) {
      throw new Error('请求过于频繁，请稍后再试');
    }
    
    // 更新 IP 请求计数
    this.updateIpCount(ip);
    
    return new Promise((resolve, reject) => {
      this.queue.push(task, (err, result) => {
        if (err) {
          this.updateErrorCount(ip);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  // 获取任务状态
  async getTaskStatus(taskId) {
    return new Promise((resolve) => {
      const status = this.queue.getStatus(taskId);
      resolve({
        taskId,
        status: status || 'not_found',
        queueLength: this.queue.length,
        timestamp: new Date().toISOString()
      });
    });
  }

  // 获取队列统计信息
  async getStats() {
    const stats = {
      queueLength: this.queue.length,
      running: this.queue.running,
      concurrency: apiConfig.queue.concurrency,
      errorCounts: Object.fromEntries(this.errorCounts),
      ipCounts: Object.fromEntries(this.ipRequestCounts),
      resourceUsage: this.resourceUsage,
      timestamp: new Date().toISOString()
    };
    
    return stats;
  }

  // 检查 IP 是否超出限制
  isIpLimited(ip) {
    const count = this.ipRequestCounts.get(ip) || 0;
    return count >= apiConfig.concurrency.maxRequestsPerIP;
  }

  // 更新 IP 请求计数
  updateIpCount(ip) {
    const count = this.ipRequestCounts.get(ip) || 0;
    this.ipRequestCounts.set(ip, count + 1);
  }

  // 检查系统资源是否过载
  isSystemOverloaded() {
    return this.resourceUsage.memory > parseFloat(apiConfig.resources.maxMemoryUsage) ||
           this.resourceUsage.cpu > parseFloat(apiConfig.resources.maxCpuUsage);
  }

  // 启动资源监控
  startResourceMonitoring() {
    setInterval(() => {
      try {
        const usage = process.memoryUsage();
        this.resourceUsage = {
          memory: (usage.heapUsed / usage.heapTotal) * 100,
          cpu: process.cpuUsage().user / 1000000, // 转换为百分比
          lastCheck: Date.now()
        };
      } catch (error) {
        console.error('资源监控错误:', error);
      }
    }, apiConfig.resources.checkInterval);
  }

  // 处理普通任务
  async processTask(task) {
    try {
      const result = await task.execute();
      return result;
    } catch (error) {
      console.error('任务处理错误:', error);
      throw error;
    }
  }

  // 延迟函数
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 判断是否需要重试
  shouldRetry(error) {
    return apiConfig.errors.retryStatuses.includes(error.status) ||
           error.message.includes('timeout') ||
           error.message.includes('network');
  }
}

export default new QueueManager(); 