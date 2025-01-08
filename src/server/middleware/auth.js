const validateApiKey = (req) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  // 支持多种认证方式
  const providedKey = apiKey || 
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);
    
  // 验证与环境变量中的 DASHSCOPE_API_KEY 是否匹配
  return providedKey === process.env.DASHSCOPE_API_KEY;
};

export default validateApiKey; 