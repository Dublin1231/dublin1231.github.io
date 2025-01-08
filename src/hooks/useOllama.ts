import { useState, useCallback } from 'react';
import { OllamaService } from '../services/ollama';
import { OLLAMA_CONFIG } from '../config/ollama';

export function useOllama() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ollamaService = new OllamaService(OLLAMA_CONFIG.baseUrl);

  const generateResponse = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ollamaService.generateCompletion({
        model: OLLAMA_CONFIG.defaultModel,
        prompt,
        options: OLLAMA_CONFIG.defaultOptions
      });
      
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const streamResponse = useCallback(async (
    prompt: string,
    onChunk: (text: string) => void
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      await ollamaService.streamCompletion({
        model: OLLAMA_CONFIG.defaultModel,
        prompt,
        options: OLLAMA_CONFIG.defaultOptions
      }, onChunk);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    generateResponse,
    streamResponse
  };
} 