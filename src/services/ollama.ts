import axios from 'axios';

interface OllamaCompletionRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaCompletionResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export class OllamaService {
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async generateCompletion(params: OllamaCompletionRequest): Promise<string> {
    try {
      const response = await axios.post<OllamaCompletionResponse>(
        `${this.baseUrl}/api/generate`,
        params
      );
      
      return response.data.response;
    } catch (error) {
      console.error('Ollama API 调用失败:', error);
      throw new Error('生成回复失败');
    }
  }

  async streamCompletion(
    params: OllamaCompletionRequest,
    onChunk: (text: string) => void
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        { ...params, stream: true },
        { responseType: 'stream' }
      );

      for await (const chunk of response.data) {
        const data = JSON.parse(chunk.toString());
        onChunk(data.response);
      }
    } catch (error) {
      console.error('Ollama 流式调用失败:', error);
      throw new Error('流式生成失败');
    }
  }
} 