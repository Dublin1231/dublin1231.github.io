export const apiConfig = {
  timeouts: {
    request: 20000, // 请求超时时间 20 秒
    socket: 25000, // Socket 超时时间 25 秒
    response: 30000 // 响应超时时间 30 秒
  },
  concurrency: {
    maxRequests: 10, // 最大并发请求数
    maxRequestsPerIP: 3, // 每个 IP 的最大并发请求数
    windowMs: 60000, // 时间窗口 1 分钟
    delayAfterExceed: 1000 // 超出限制后的延迟时间（毫秒）
  },
  queue: {
    enabled: true, // 启用队列
    maxSize: 100, // 最大队列长度
    timeout: 30000, // 队列超时时间
    concurrency: 5, // 队列并发处理数
    retryCount: 2, // 重试次数
    retryDelay: 1000, // 重试延迟（毫秒）
    chunkDelay: 100 // 块处理延迟（毫秒）
  },
  cache: {
    levels: {
      l1: {
        type: 'memory',
        maxSize: 1000,
        ttl: 300 // 5分钟
      },
      l2: {
        type: 'memory',
        ttl: 3600 // 1小时
      }
    },
    warmup: {
      enabled: true,
      interval: 300000, // 5分钟
      batchSize: 50
    }
  },
  modelConfig: {
    'qwen-long': {
      maxProcessingTime: 180000, // 3分钟
      timeoutPerToken: 0.1, // 每token处理时间（毫秒）
      chunkSize: 2000, // 每块大小
      chunkOverlap: 200 // 块重叠大小
    },
    'qwen-plus-1220': {
      maxProcessingTime: 180000,
      timeoutPerToken: 0.1,
      chunkSize: 2000,
      chunkOverlap: 200
    },
    'qwen-max': {
      maxProcessingTime: 180000,
      timeoutPerToken: 0.1,
      chunkSize: 2000,
      chunkOverlap: 200
    },
    'qwen-lv-max': {
      maxProcessingTime: 180000,
      timeoutPerToken: 0.1,
      chunkSize: 2000,
      chunkOverlap: 200
    }
  },
  resources: {
    maxMemoryUsage: '80%',
    maxCpuUsage: '70%',
    checkInterval: 5000,
    cooldownThreshold: '75%'
  },
  errors: {
    retryStatuses: [429, 500, 502, 503, 504],
    maxRetries: 3,
    retryDelay: 1000,
    errorThreshold: 5
  }
};

export default apiConfig; 