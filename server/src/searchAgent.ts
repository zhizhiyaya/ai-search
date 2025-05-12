import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pipeline, env } from '@xenova/transformers';
import openai from './openai';
import fs from 'fs';
import util from '../utils/similarity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// 配置 transformers.js
const modelPath = join(__dirname, '../models');
console.log('📁 模型路径:', modelPath);
env.localModelPath = modelPath; // 设置本地模型缓存目录
env.allowRemoteModels = false; // 允许远程模型下载
env.useBrowserCache = false; // 禁用浏览器缓存

// 配置代理
// const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
// if (proxyUrl) {
//   console.log('🌐 使用代理:', proxyUrl);
//   // @ts-ignore
//   env.proxy = proxyUrl;
// } else {
//   console.log('⚠️ 未配置代理，建议设置 HTTPS_PROXY 或 HTTP_PROXY 环境变量');
// }

// 检查模型文件是否存在
function checkModelFiles() {
  const modelDir = join(modelPath, 'Xenova/all-MiniLM-L6-v2');
  console.log('🔍 检查模型目录:', modelDir);
  
  const requiredFiles = [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'special_tokens_map.json'
  ];

  if (!fs.existsSync(modelDir)) {
    console.error(`❌ 模型目录不存在: ${modelDir}`);
    console.log('请按照以下步骤下载模型文件：');
    console.log('1. 创建目录: mkdir -p models/Xenova/all-MiniLM-L6-v2');
    console.log('2. 从 https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main 下载以下文件：');
    requiredFiles.forEach(file => console.log(`   - ${file}`));
    console.log('3. 将文件放入 models/Xenova/all-MiniLM-L6-v2 目录');
    return false;
  }

  // 列出目录中的所有文件
  console.log('📂 目录中的文件:');
  fs.readdirSync(modelDir).forEach(file => {
    console.log(`   - ${file}`);
  });

  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(join(modelDir, file))
  );

  if (missingFiles.length > 0) {
    console.error('❌ 缺少以下模型文件：');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }

  console.log('✅ 模型文件检查通过');
  return true;
}

// 初始化数据库
const db = new Database(process.env.DB_PATH || join(__dirname, '../data/search.db'));

// 初始化向量模型
let embedder: any = null;
let modelStatus = {
  isInitialized: false,
  modelName: 'Xenova/all-MiniLM-L6-v2',
  lastError: null as string | null,
  initializationTime: 0,
  retryCount: 0
};

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 计算余弦相似度
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitude1 * magnitude2);
}

// 初始化模型函数
export async function initializeModel(retryCount = 0) {
  if (!modelStatus.isInitialized) {
    console.log(`🚀 开始加载向量模型... (尝试 ${retryCount + 1}/3)`);
    
    // 检查模型文件
    if (!checkModelFiles()) {
      const error = '模型文件不完整，请先下载模型文件';
      modelStatus.lastError = error;
      throw new Error(error);
    }

    const startTime = Date.now();
    try {
      console.log('🔄 开始初始化模型...');
      // 设置超时时间
      const timeout = 30000; // 30秒
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('模型加载超时')), timeout);
      });

      // 使用 Promise.race 来处理超时
      console.log('📥 加载模型文件...');
      embedder = await Promise.race([
        // pipeline('feature-extraction', modelStatus.modelName, {
        //   quantized: true
        // }),
        pipeline(
          'feature-extraction',
          modelStatus.modelName, // 本地目录路径
          { local_files_only: true }
        ),
        timeoutPromise
      ]);
      console.log('✅ 模型文件加载完成');

      modelStatus.isInitialized = true;
      modelStatus.initializationTime = Date.now() - startTime;
      modelStatus.lastError = null;
      modelStatus.retryCount = 0;
      console.log(`✅ 向量模型加载成功！用时: ${modelStatus.initializationTime}ms`);
      console.log(`📦 模型信息: ${modelStatus.modelName}`);
      
      // 测试模型
      console.log('🧪 开始测试模型...');
      const testEmbedding = await getEmbedding('测试文本');
      console.log(`🔍 测试向量维度: ${testEmbedding.length}`);
    } catch (error) {
      modelStatus.lastError = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 向量模型加载失败 (尝试 ${retryCount + 1}/3):`, error);
      
      // 如果还有重试次数，等待后重试
      if (retryCount < 2) {
        console.log(`⏳ 等待 5 秒后重试...`);
        await delay(5000);
        return initializeModel(retryCount + 1);
      }
      
      throw error;
    }
  }
  return embedder;
}

// 立即开始初始化模型
console.log('🚀 服务启动，开始初始化模型...');
initializeModel().catch(error => {
  console.error('模型初始化失败，请检查网络连接或代理设置:', error);
  console.log('提示: 如果遇到网络问题，可以尝试:');
  console.log('1. 检查网络连接');
  console.log('2. 设置代理环境变量:');
  console.log('   export HTTPS_PROXY=http://your-proxy:port');
  console.log('   export HTTP_PROXY=http://your-proxy:port');
});

// 获取模型状态
export function getModelStatus() {
  return {
    ...modelStatus,
    isReady: modelStatus.isInitialized && !modelStatus.lastError
  };
}

// 定义搜索结果接口
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

// 语义搜索函数
export async function searchBySemantics(query: string): Promise<SearchResult[]> {
  try {
    if (!modelStatus.isInitialized) {
      console.log('⚠️ 向量模型未初始化，正在加载...');
      await initializeModel();
    }

    // 获取查询的向量表示
    const queryEmbedding = await getEmbedding(query);
    
    // 从数据库获取所有文档
    const documents = db.prepare(`
      SELECT id, title, content, embedding
      FROM documents
    `).all() as (SearchResult & { embedding: string })[];

    // 计算相似度并排序
    const results = documents
      .map(doc => {
        const docEmbedding = JSON.parse(doc.embedding);
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        return {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          similarity
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

// 生成答案函数
export async function generateAnswer(query: string, results: SearchResult[]): Promise<string> {
  try {
    const context = results.map(r => `${r.title}: ${r.content}`).join('\n');
    console.log('context', context);
    const completion = await openai.inference({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个专业的搜索助手，请根据提供的上下文回答用户的问题。"
        },
        {
          role: "user",
          content: `问题：${query}\n\n上下文：\n${context}`
        }
      ],
    });
    console.log('completion', completion);
    return completion.text || '抱歉，我无法生成答案。';
  } catch (error) {
    console.error('Answer generation error:', error);
    throw error;
  }
}

// 获取文本嵌入向量
async function getEmbedding(text: string): Promise<number[]> {
  try {
    if (!embedder) {
      await initializeModel();
    }
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
} 