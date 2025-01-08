import cacheManager from '../services/cacheManager.js';
import { apiConfig } from '../config/api.config.js';

// 缓存中间件
export const cacheMiddleware = async (req, res, next) => {
  // 只缓存GET请求
  if (req.method !== 'GET') {
    return next();
  }

  // 生成缓存键
  const cacheKey = `${req.originalUrl}:${JSON.stringify(req.query)}`;

  try {
    // 尝试从缓存获取
    const cachedData = await cacheManager.get(cacheKey);
    
    if (cachedData) {
      // 设置缓存命中标记
      res.setHeader('X-Cache-Hit', 'true');
      return res.json(cachedData);
    }

    // 修改响应对象的 json 方法
    const originalJson = res.json;
    res.json = function(data) {
      // 如果响应成功，则缓存结果
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheManager.set(cacheKey, data, {
          ttl: apiConfig.cache.levels.l1.ttl
        });
      }
      
      // 设置缓存未命中标记
      res.setHeader('X-Cache-Hit', 'false');
      
      // 调用原始的 json 方法
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('缓存中间件错误:', error);
    next();
  }
}; 