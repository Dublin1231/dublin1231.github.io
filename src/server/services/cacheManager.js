import { apiConfig } from '../config/api.config.js';
import { LRUCache } from 'lru-cache';
import * as Redis from 'ioredis';

class CacheManager {
  constructor() {
    // 初始化内存缓存
    this.memoryCache = new LRUCache({
      max: apiConfig.cache.levels.l1.maxSize,
      ttl: apiConfig.cache.levels.l1.ttl * 1000
    });

    // 初始化 Redis 缓存（如果配置启用）
    if (apiConfig.cache.levels.l2.type === 'redis') {
      try {
        this.redisCache = new Redis.default({
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          reconnectOnError: function (err) {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
          showFriendlyErrorStack: true
        });

        // 处理 Redis 错误
        this.redisCache.on('error', (error) => {
          console.warn('Redis连接错误，将使用内存缓存作为备选:', error.message);
          this.redisCache = null;
        });

        this.redisCache.on('connect', () => {
          console.log('Redis连接成功');
        });
      } catch (error) {
        console.warn('Redis初始化失败，将仅使用内存缓存:', error.message);
        this.redisCache = null;
      }
    }

    // 初始化缓存统计
    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      l2Hits: 0
    };
  }

  // 生成缓存键
  generateCacheKey(data) {
    const { model, input, options } = data;
    return `${model}:${Buffer.from(JSON.stringify(input)).toString('base64')}:${JSON.stringify(options)}`;
  }

  // 获取缓存数据
  async get(key) {
    try {
      // 先查询一级缓存
      let result = this.memoryCache.get(key);
      if (result) {
        this.stats.hits++;
        this.stats.l1Hits++;
        return result;
      }

      // 如果 Redis 可用，查询二级缓存
      if (this.redisCache) {
        try {
          const redisResult = await this.redisCache.get(key);
          if (redisResult) {
            result = JSON.parse(redisResult);
            // 将数据加入一级缓存
            this.memoryCache.set(key, result);
            this.stats.hits++;
            this.stats.l2Hits++;
            return result;
          }
        } catch (error) {
          console.warn('Redis读取错误，将使用内存缓存:', error.message);
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('缓存读取错误:', error);
      return null;
    }
  }

  // 设置缓存数据
  async set(key, value, options = {}) {
    try {
      // 设置一级缓存
      this.memoryCache.set(key, value);

      // 如果 Redis 可用，设置二级缓存
      if (this.redisCache) {
        try {
          const serializedValue = JSON.stringify(value);
          const ttl = options.ttl || apiConfig.cache.levels.l2.ttl;
          await this.redisCache.setex(key, ttl, serializedValue);
        } catch (error) {
          console.warn('Redis写入错误:', error.message);
        }
      }
    } catch (error) {
      console.error('缓存写入错误:', error);
    }
  }

  // 删除缓存
  async delete(key) {
    try {
      this.memoryCache.delete(key);
      if (this.redisCache) {
        try {
          await this.redisCache.del(key);
        } catch (error) {
          console.warn('Redis删除错误:', error.message);
        }
      }
    } catch (error) {
      console.error('缓存删除错误:', error);
    }
  }

  // 清理过期缓存
  async cleanup() {
    try {
      // 清理内存缓存
      this.memoryCache.purgeStale();

      // 如果 Redis 可用，清理 Redis 缓存
      if (this.redisCache) {
        try {
          // 使用 Redis SCAN 命令扫描过期键
          let cursor = '0';
          do {
            const [nextCursor, keys] = await this.redisCache.scan(
              cursor,
              'MATCH',
              '*',
              'COUNT',
              100
            );
            cursor = nextCursor;

            for (const key of keys) {
              const ttl = await this.redisCache.ttl(key);
              if (ttl <= 0) {
                await this.redisCache.del(key);
              }
            }
          } while (cursor !== '0');
        } catch (error) {
          console.warn('Redis清理错误:', error.message);
        }
      }
    } catch (error) {
      console.error('缓存清理错误:', error);
    }
  }

  // 获取缓存统计信息
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests === 0 ? 0 : (this.stats.hits / totalRequests) * 100;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      memorySize: Math.round(this.memoryCache.size / 1024 / 1024), // 转换为MB
      memoryMaxSize: Math.round(apiConfig.cache.levels.l1.maxSize / 1024 / 1024), // 转换为MB
      hitRate: hitRate.toFixed(1),
      redisAvailable: !!this.redisCache
    };
  }

  // 重置统计信息
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      l2Hits: 0
    };
  }
}

export default new CacheManager(); 