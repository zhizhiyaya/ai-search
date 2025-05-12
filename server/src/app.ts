import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { searchBySemantics, generateAnswer, getModelStatus } from './searchAgent.js';

// 定义请求体类型
interface SearchRequestBody {
  query: string;
}

const app = new Koa();
const router = new Router();

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Server error:', err);
    ctx.status = 500;
    ctx.body = { error: '服务器内部错误' };
  }
});

// 启用 CORS
app.use(cors());

// 解析请求体
app.use(bodyParser());

// 状态检查路由
router.get('/api/status', async (ctx) => {
  ctx.body = {
    status: 'ok',
    model: getModelStatus(),
    timestamp: new Date().toISOString()
  };
});

// 搜索路由
router.post('/api/search', async (ctx) => {
  const body = ctx.request.body as SearchRequestBody;
  
  if (!body.query) {
    ctx.status = 400;
    ctx.body = { error: '请提供搜索内容' };
    return;
  }

  try {
    const results = await searchBySemantics(body.query);
    ctx.body = { results };

    // const answer = await generateAnswer(body.query, results);
    // ctx.body = { answer, results };
  } catch (error) {
    console.error('Search error:', error);
    ctx.status = 500;
    ctx.body = { error: '搜索失败，请稍后重试' };
  }
});

// 注册路由中间件
app.use(router.routes());
app.use(router.allowedMethods());

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 服务运行在 http://localhost:${port}`);
});
