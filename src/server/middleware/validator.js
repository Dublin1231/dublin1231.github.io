import { ValidationError } from '../utils/errors.js'

// 验证项目分析请求
export function validateAnalyzeRequest(req, res, next) {
  try {
    const { prompt } = req.body
    
    if (!prompt) {
      throw new ValidationError('项目需求不能为空')
    }
    
    if (typeof prompt !== 'string') {
      throw new ValidationError('项目需求必须是字符串')
    }
    
    if (prompt.length < 10) {
      throw new ValidationError('项目需求描述太短，请详细描述您的需求')
    }
    
    if (prompt.length > 5000) {
      throw new ValidationError('项目需求描述过长，请精简您的需求')
    }
    
    next()
  } catch (error) {
    next(error)
  }
}

// 验证批量分析请求
export function validateBatchAnalyzeRequest(req, res, next) {
  try {
    const { prompts } = req.body
    
    if (!Array.isArray(prompts)) {
      throw new ValidationError('prompts必须是数组')
    }
    
    if (prompts.length === 0) {
      throw new ValidationError('prompts数组不能为空')
    }
    
    if (prompts.length > 10) {
      throw new ValidationError('批量请求最多支持10个项目')
    }
    
    prompts.forEach((prompt, index) => {
      if (typeof prompt !== 'string') {
        throw new ValidationError(`第${index + 1}个项目需求必须是字符串`)
      }
      
      if (prompt.length < 10) {
        throw new ValidationError(`第${index + 1}个项目需求描述太短`)
      }
      
      if (prompt.length > 5000) {
        throw new ValidationError(`第${index + 1}个项目需求描述过长`)
      }
    })
    
    next()
  } catch (error) {
    next(error)
  }
}

// 验证任务ID
export function validateTaskId(req, res, next) {
  try {
    const { taskId } = req.params
    
    if (!taskId) {
      throw new ValidationError('任务ID不能为空')
    }
    
    if (typeof taskId !== 'string') {
      throw new ValidationError('任务ID必须是字符串')
    }
    
    if (taskId.length < 5) {
      throw new ValidationError('无效的任务ID')
    }
    
    next()
  } catch (error) {
    next(error)
  }
}

// 验证缓存Key
export function validateCacheKey(req, res, next) {
  try {
    const { cacheKey } = req.query
    
    if (!cacheKey) {
      throw new ValidationError('缓存Key不能为空')
    }
    
    try {
      JSON.parse(cacheKey)
    } catch (e) {
      throw new ValidationError('无效的缓存Key格式')
    }
    
    next()
  } catch (error) {
    next(error)
  }
} 