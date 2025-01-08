const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function runTests() {
  try {
    // 测试健康检查
    console.log('\n测试健康检查...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('健康检查响应:', healthResponse.data);

    // 测试保存消息
    console.log('\n测试保存消息...');
    const saveResponse = await axios.post(`${API_URL}/api/messages`, {
      modelId: 'qwen-long',
      role: 'user',
      content: '测试消息',
      timestamp: new Date().toISOString()
    });
    console.log('保存消息响应:', saveResponse.data);

    // 测试获取消息
    console.log('\n测试获取消息...');
    const getResponse = await axios.get(`${API_URL}/api/messages/qwen-long`);
    console.log('获取消息响应:', getResponse.data);

    // 测试清除消息
    console.log('\n测试清除消息...');
    const deleteResponse = await axios.delete(`${API_URL}/api/messages/qwen-long`);
    console.log('清除消息响应:', deleteResponse.data);

    // 验证消息已清除
    console.log('\n验证消息已清除...');
    const verifyResponse = await axios.get(`${API_URL}/api/messages/qwen-long`);
    console.log('验证响应:', verifyResponse.data);

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

runTests(); 