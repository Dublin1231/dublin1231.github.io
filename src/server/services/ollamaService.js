const ollamaService = {
  async chat(model, messages) {
    try {
      // 移除 'ollama-' 前缀
      const actualModel = model.replace('ollama-', '')
      
      console.log('发送到 Ollama 的请求:', {
        model: actualModel,
        messages: messages
      })
      
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: actualModel,
          messages: messages
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API 错误: ${response.status}`)
      }

      const data = await response.json()
      console.log('Ollama 响应:', data)
      
      return data
    } catch (error) {
      console.error('Ollama 服务错误:', error)
      throw error
    }
  },

  async listModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      if (!response.ok) {
        throw new Error(`Ollama API 错误: ${response.status}`)
      }
      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('获取模型列表失败:', error)
      throw error
    }
  }
}

export default ollamaService 