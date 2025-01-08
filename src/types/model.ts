export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: 'ollama' | 'other'; // 可以根据需要添加其他类型
  size?: string;
  updateTime?: string;
  icon?: string;
} 