import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取.env文件
function getApiKey() {
  try {
    const envPath = join(__dirname, '../../../.env');
    console.log('尝试读取环境变量文件:', envPath);
    const envContent = readFileSync(envPath, 'utf-8');
    
    // 读取API密钥
    const apiKeyMatch = envContent.match(/DASHSCOPE_API_KEY=(.+)/);
    if (!apiKeyMatch) {
      throw new Error('未找到DASHSCOPE_API_KEY配置');
    }
    const apiKey = apiKeyMatch[1].trim().replace(/^["']|["']$/g, '');
    return apiKey;
  } catch (error) {
    console.error('读取配置失败:', error);
    return null;
  }
}

const API_KEY = getApiKey();

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  timeout: 60000, // 60秒超时
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加重试机制
async function retryRequest(fn, retries = 3, delay = 2000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
}

// 分块处理大型prompt
function splitPrompt(prompt) {
  const maxLength = 500;
  const chunks = [];
  let current = '';
  
  const sentences = prompt.split(/[.。!！?？]/);
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current.trim());
  
  return chunks;
}

// 流式聊天接口
async function* streamChat(model, input) {
  try {
    if (!API_KEY) {
      throw new Error('未设置API密钥，请检查.env文件配置');
    }

    console.log('开始流式聊天请求:', {
      model,
      messages: input.messages,
      apiKey: API_KEY.substring(0, 8) + '...'
    });

    const requestData = {
      model: model || "qwen-plus",
      input: {
        messages: input.messages
      },
      parameters: {
        result_format: "message",
        stream: true,
        incremental_output: true,
        temperature: 0.7,
        top_p: 0.8
      }
    };

    console.log('发送请求数据:', JSON.stringify(requestData, null, 2));

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-DashScope-SSE': 'enable'
      },
      body: JSON.stringify(requestData)
    });

    console.log('收到响应:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('流读取完成');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('收到原始数据块:', chunk);
        
        buffer += chunk;
        const lines = buffer.split('\n');
        
        // 保留最后一行，因为它可能是不完整的
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') {
            console.log('跳过空行');
            continue;
          }
          if (!line.startsWith('data:')) {
            console.log('跳过非data行:', line);
            continue;
          }

          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            console.log('收到结束标记');
            continue;
          }

          try {
            const jsonData = JSON.parse(data);
            console.log('解析的数据:', jsonData);

            if (jsonData.output?.choices?.[0]?.message?.content !== undefined) {
              const content = jsonData.output.choices[0].message.content;
              const role = jsonData.output.choices[0].message.role || 'assistant';
              
              console.log('生成响应:', { content, role });
              
              yield {
                output: {
                  choices: [{
                    message: {
                      content,
                      role
                    }
                  }]
                }
              };
            } else {
              console.log('响应数据格式不符合预期:', jsonData);
            }
          } catch (error) {
            console.error('解析SSE数据失败:', {
              error: error.message,
              data,
              line
            });
          }
        }
      }
    } catch (streamError) {
      console.error('流读取错误:', streamError);
      throw streamError;
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('流式聊天请求失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });

    throw error;
  }
}

export async function analyzeWithAI(prompt, projectType) {
  try {
    console.log('准备调用AI API...');
    console.log('项目类型:', projectType);
    
    if (!API_KEY) {
      throw new Error('未设置API密钥，请检查.env文件配置');
    }

    // 分块处理prompt
    const chunks = splitPrompt(prompt);
    
    // 并行处理所有chunks
    const analysisPromises = chunks.map(async (chunk) => {
      const message = `请严格按照以下格式分析项目需求,必须完整回答每一个部分,不能遗漏任何章节:

# 项目分析报告

## 一、项目概述
项目类型：${projectType.join(', ')}
需求描述：${chunk}

## 二、技术方案

### 1. 技术栈选择
- 开发语言:
- 框架选择:
- 开发工具:
- UI组件:
- 多媒体处理:
- 数据存储:
[请详细说明每个技术选择的原因和优势]

### 2. 架构设计
- 整体架构:
- 模块划分:
- 数据流设计:
- 界面结构:
[请详细说明架构设计的考虑和实现方案]

### 3. 关键功能实现
- 功能1:实现方案
- 功能2:实现方案
- 功能3:实现方案
[请列出所有关键功能的具体实现方案]

### 4. 开发建议
- 开发流程:
- 测试策略:
- 部署方案:
- 性能优化:
[请提供详细的开发建议]

## 三、风险评估

### 1. 潜在挑战
- 技术挑战:
- 性能挑战:
- 用户体验挑战:
- 安全性挑战:
[请详细分析每个挑战的具体内容]

### 2. 解决方案
- 应对方案1:
- 应对方案2:
- 应对方案3:
- 应对方案4:
[请针对每个挑战提供具体的解决方案]

## 四、其他建议

### 1. 接单注意事项
- 时间评估:
- 成本评估:
- 技术储备:
- 沟通要点:
[请详细列出接单时需要注意的具体事项]

### 2. 其他建议
- 建议1:
- 建议2:
- 建议3:
- 建议4:
[请提供其他补充建议]

请严格按照上述格式输出,必须完整回答每一个部分,不能遗漏任何章节。不要输出任何其他格式的内容。`;

      return retryRequest(async () => {
        const response = await apiClient.post('', {
          model: "qwen-long",
          input: {
            messages: [
              { 
                role: "system", 
                content: `你是一个专业的技术方案分析师。你必须严格遵循以下要求,违反要求将被拒绝:

1. 输出格式强制要求:
- 必须完全按照给定的markdown格式输出分析报告
- 必须使用指定的标题层级(#、##、###)
- 必须包含所有指定的章节和子项
- 每个[]占位符都必须替换为实际内容
- 不允许添加任何未在模板中指定的章节
- 不允许改变任何章节的顺序

2. 内容要求:
- 每个章节必须详细完整地回答
- 必须针对具体项目进行分析
- 必须保持专业性和技术准确性
- 必须使用清晰的条理性语言

3. 严格禁止:
- 禁止输出任何闲聊内容(如"您好"、"希望对您有帮助"等)
- 禁止输出任何代码块
- 禁止改变预设格式
- 禁止输出未经要求的内容

4. 错误示例:
错误示例1: "您好!让我为您分析..."(禁止闲聊开场)
错误示例2: "根据您的描述..."(禁止对用户直接称呼)
错误示例3: "这个项目可以这样做..."(禁止非结构化描述)

5. 正确示例:
# 项目分析报告
## 一、项目概述
项目类型：[具体类型]
需求描述：[具体描述]
...
(完整遵循模板格式)` 
              },
              { role: "user", content: message }
            ]
          },
          parameters: {
            temperature: 0.2, // 进一步降低随机性
            top_p: 0.9,
            max_tokens: 100000, // 增加token以确保完整输出
            result_format: "message"
          }
        }, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        });

        if (response.data?.output?.choices?.[0]) {
          return response.data.output.choices[0].message.content;
        }
        throw new Error('API返回结果格式错误');
      });
    });
    
    // 等待所有分析完成
    const results = await Promise.all(analysisPromises);
    
    // 合并结果
    const combinedAnalysis = results.join('\n\n');
    
    // 生成最终总结
    const summaryResponse = await retryRequest(async () => {
      const response = await apiClient.post('', {
        model: "qwen-plus",
        input: {
          messages: [
            { role: "system", content: "你是一个专业的软件开发顾问，请总结之前的分析结果。" },
            { role: "user", content: `请对以下分析结果进行总结：\n${combinedAnalysis}` }
          ]
        },
        parameters: {
          temperature: 0.7,
          top_p: 0.8,
          max_tokens: 1000,
          result_format: "message"
        }
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      if (response.data?.output?.choices?.[0]) {
        return response.data.output.choices[0].message.content;
      }
      throw new Error('API返回结果格式错误');
    });

    return summaryResponse;
    
  } catch (error) {
    console.error('API调用失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      throw new Error('API密钥无效，请检查配置');
    } else if (error.response?.status === 429) {
      throw new Error('API调用次数超限，请稍后重试');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('无法连接到API服务器，请检查网络');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('API请求超时，请重试');
    } else {
      throw new Error(`AI服务调用失败: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default {
  analyzeWithAI,
  streamChat
};