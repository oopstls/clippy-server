import Database from 'better-sqlite3';
import path from 'path';
import config from './config';
import fs from 'fs';
import { HistoryMessage } from './types'; // 确保导入 HistoryMessage

// 定义 InsertResult 接口
interface InsertResult {
  timestamp: string;
}

// 确保数据库目录存在
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`已创建数据库目录: ${dbDir}`);
}

// 数据库文件路径
const dbPath = path.join(dbDir, 'messages.db');

// 初始化数据库
let db: Database.Database;
try {
  db = new Database(dbPath);
  console.log(`成功连接到数据库: ${dbPath}`);
} catch (error) {
  console.error(`无法连接到数据库: ${error}`);
  throw error; // 重新抛出错误，防止服务器继续运行
}

// 创建 messages 表，如果不存在
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,
      userId TEXT NOT NULL,
      type TEXT CHECK(type IN ('text', 'image')) NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log(`确保 'messages' 表存在`);
} catch (error) {
  console.error(`无法创建或验证 'messages' 表: ${error}`);
  throw error;
}

/**
 * 插入一条消息到数据库，并返回时间戳
 * @param room 房间号
 * @param userId 用户ID
 * @param type 消息类型 ('text' | 'image')
 * @param content 消息内容
 * @returns 服务器记录的时间戳
 */
export function insertMessage(room: string, userId: string, type: 'text' | 'image', content: string): string {
  try {
    const stmt = db.prepare(`
      INSERT INTO messages (room, userId, type, content)
      VALUES (?, ?, ?, ?)
      RETURNING timestamp
    `);
    
    // 使用类型断言将返回值转换为 InsertResult
    const result = stmt.get(room, userId, type, content) as InsertResult;
    
    console.log(`插入消息到房间 ${room} | 用户ID: ${userId} | 类型: ${type} | 时间戳: ${result.timestamp}`);
    
    if (result && result.timestamp) {
      return result.timestamp;
    } else {
      throw new Error('Failed to retrieve timestamp after inserting message');
    }
  } catch (error) {
    console.error(`插入消息失败 | 房间: ${room} | 用户ID: ${userId} | 类型: ${type} | 错误: ${error}`);
    throw error;
  }
}

/**
 * 获取指定房间的历史消息
 * @param room 房间号
 * @returns 消息数组
 */
export function getMessages(room: string): HistoryMessage[] {
  try {
    const stmt = db.prepare(`
      SELECT id, room, userId, type, content, timestamp
      FROM messages
      WHERE room = ?
      ORDER BY timestamp ASC
    `);
    // 传递 room 参数给 stmt.all()
    const messages = stmt.all(room) as HistoryMessage[];
    console.log(`获取房间 ${room} 的历史消息数量: ${messages.length}`);
    return messages;
  } catch (error) {
    console.error(`获取房间 ${room} 的历史消息失败: ${error}`);
    throw error;
  }
}

/**
 * 删除指定房间的所有消息
 * @param room 房间号
 */
export function deleteMessages(room: string): void {
  try {
    const stmt = db.prepare(`
      DELETE FROM messages
      WHERE room = ?
    `);
    const result = stmt.run(room);
    console.log(`删除房间 ${room} 的所有消息，受影响行数: ${result.changes}`);
  } catch (error) {
    console.error(`删除房间 ${room} 的消息失败: ${error}`);
    throw error;
  }
}

export default db;

