import { useOllama } from '../hooks/useOllama';

export function Chat() {
  const { loading, error, generateResponse, streamResponse } = useOllama();
  
  const handleSendMessage = async (message: string) => {
    // 普通对话
    const response = await generateResponse(message);
    if (response) {
      // 处理响应...
    }
    
    // 或者使用流式响应
    await streamResponse(message, (chunk) => {
      // 处理每个文本块...
    });
  };
  
  return (
    <div>
      {/* 聊天界面组件 */}
      {loading && <div>正在生成回复...</div>}
      {error && <div>错误: {error}</div>}
    </div>
  );
} 