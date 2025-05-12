import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const db = new Database(process.env.DB_PATH || join(__dirname, '../data/search.db'));

// 创建文档表
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL
  )
`);

// 创建向量相似度函数
db.exec(`
  CREATE TABLE IF NOT EXISTS vector_similarity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    function TEXT NOT NULL
  )
`);

// 插入示例数据
const sampleData = [
  {
    id: '1',
    title: '用户登录功能',
    content: '实现用户登录功能，包括用户名密码验证和记住登录状态',
    embedding: JSON.stringify([0.1, 0.2, 0.3]) // 示例向量
  },
  {
    id: '2',
    title: '数据导出功能',
    content: '支持将数据导出为Excel和CSV格式',
    embedding: JSON.stringify([0.2, 0.3, 0.4]) // 示例向量
  }
];

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO documents (id, title, content, embedding)
  VALUES (@id, @title, @content, @embedding)
`);

for (const data of sampleData) {
  insertStmt.run(data);
}

console.log('数据库初始化完成！'); 