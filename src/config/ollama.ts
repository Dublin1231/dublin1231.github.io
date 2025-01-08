export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_MODEL || 'llama2',
  defaultOptions: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40
  }
}; 