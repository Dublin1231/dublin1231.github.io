import axios from 'axios';

const API_URL = 'http://127.0.0.1:3456';
const API_KEY = process.env.API_KEY;

async function testApiConnection() {
  if (!API_KEY) {
    console.error('错误: 未设置API_KEY环境变量');
    process.exit(1);
  }
  
  try {
    // 测试健康检查端点
    console.log('测试健康检查端点...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('健康检查响应:', healthResponse.data);

    // 测试缓存统计端点
    console.log('\n测试缓存统计端点...');
    const cacheResponse = await axios.get(`${API_URL}/api/cache/stats`, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    console.log('缓存统计响应:', cacheResponse.data);

    // 测试队列统计端点
    console.log('\n测试队列统计端点...');
    const queueResponse = await axios.get(`${API_URL}/api/queue/stats`, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    console.log('队列统计响应:', queueResponse.data);

  } catch (error) {
    if (error.response) {
      // 服务器返回错误响应
      console.error('API错误:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // 请求发送失败
      console.error('请求错误:', error.message);
      console.log('检查服务器是否正在运行...');
      console.log('- 确保运行了 npm run server');
      console.log(`- 检查${API_URL}是否可访问`);
      console.log('- 查看服务器日志是否有错误');
    } else {
      // 其他错误
      console.error('其他错误:', error.message);
    }
  }
}

// 运行测试
testApiConnection(); 