// 基础API错误类
export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

// 验证错误
export class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, 400, details)
  }
}

// 未授权错误
export class UnauthorizedError extends APIError {
  constructor(message = '未授权访问', details = null) {
    super(message, 401, details)
  }
}

// 禁止访问错误
export class ForbiddenError extends APIError {
  constructor(message = '禁止访问', details = null) {
    super(message, 403, details)
  }
}

// 资源未找到错误
export class NotFoundError extends APIError {
  constructor(message = '资源未找到', details = null) {
    super(message, 404, details)
  }
}

// 请求超时错误
export class TimeoutError extends APIError {
  constructor(message = '请求超时', details = null) {
    super(message, 408, details)
  }
}

// 请求过于频繁错误
export class TooManyRequestsError extends APIError {
  constructor(message = '请求过于频繁', details = null) {
    super(message, 429, details)
  }
}

// 服务器内部错误
export class InternalServerError extends APIError {
  constructor(message = '服务器内部错误', details = null) {
    super(message, 500, details)
  }
}

// 服务不可用错误
export class ServiceUnavailableError extends APIError {
  constructor(message = '服务暂时不可用', details = null) {
    super(message, 503, details)
  }
}

// 网关超时错误
export class GatewayTimeoutError extends APIError {
  constructor(message = '网关超时', details = null) {
    super(message, 504, details)
  }
} 