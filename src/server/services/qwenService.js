import axios from 'axios'

class QwenService {
  constructor() {
    this.API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    this.API_KEY = process.env.QWEN_API_KEY
  }

  async chat(model, messages) {
    try {
      console.log('调用 Qwen API:', { model, messages })
      
      // 根据模型ID选择正确的模型名称
      const modelName = this.getModelName(model)
      
      const response = await axios.post(
        this.API_URL,
        {
          model: modelName,
          input: {
            messages: messages
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('Qwen API 响应:', response.data)
      
      return {
        response: response.data.output.text,
        message: response.data.output.text
      }
    } catch (error) {
      console.error('Qwen API 调用失败:', error)
      throw new Error(`Qwen API 调用失败: ${error.message}`)
    }
  }

  getModelName(modelId) {
    const modelMap = {
      'qwen-long': 'qwen-max-longcontext',
      'qwen-plus-1220': 'qwen-plus-1220',
      'qwen-max': 'qwen-max',
      'qwen-lv-max': 'qwen-lv-max'
    }
    return modelMap[modelId] || modelId
  }
}

export default new QwenService() 