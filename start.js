import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import responseTime from 'response-time';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(responseTime());

// 静态文件服务
app.use(express.static(join(__dirname, 'dist')));

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 