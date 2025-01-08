import { defineStore } from 'pinia';

export const useModelStore = defineStore('model', {
  state: () => ({
    currentModel: {
      id: 'tongyi-long',
      name: '通义千问-Long',
      type: 'other'
    },
    availableModels: [
      {
        id: 'tongyi-long',
        name: '通义千问-Long',
        description: '通义千问是最新升级的超规模语言模型，中文、文学多语言输入，基于qwen-long的功能增强开发，记忆长度更长，性能更优。',
        type: 'other',
        size: '32K',
        updateTime: '2024-10-15'
      },
      {
        id: 'llama2',
        name: 'Llama2',
        description: 'Llama2 本地模型',
        type: 'ollama',
        size: '7B',
        updateTime: '2024-03-20'
      }
      // 可以添加更多模型
    ]
  }),
  
  actions: {
    setCurrentModel(modelId: string) {
      const model = this.availableModels.find(m => m.id === modelId);
      if (model) {
        this.currentModel = model;
      }
    }
  }
}); 