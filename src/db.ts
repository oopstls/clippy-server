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
const dbDir = path.join(__dirname, '../', config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`已创建数据库目录: ${dbDir}`);
}

// 数据库连接缓存
const dbConnections: Map<string, Database.Database> = new Map();

/**
 * 获取或创建房间的数据库连接
 * @param room 房间号
 * @returns 数据库连接实例
 */
function getRoomDB(room: string): Database.Database {
  if (dbConnections.has(room)) {
    return dbConnections.get(room)!;
  }

  const dbPath = path.join(dbDir, `${room}.db`);
  try {
    const db = new Database(dbPath);
    
    // 创建 messages 表
    db.prepare(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        type TEXT CHECK(type IN ('text', 'image')) NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    dbConnections.set(room, db);
    console.log(`成功连接到房间 ${room} 的数据库: ${dbPath}`);
    return db;
  } catch (error) {
    console.error(`无法连接到房间 ${room} 的数据库: ${error}`);
    throw error;
  }
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
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      INSERT INTO messages (userId, type, content)
      VALUES (?, ?, ?)
      RETURNING timestamp
    `);
    
    const result = stmt.get(userId, type, content) as InsertResult;
    
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
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      SELECT id, userId, type, content, timestamp
      FROM messages
      ORDER BY timestamp ASC
    `);
    
    const messages = stmt.all() as HistoryMessage[];
    console.log(`获取房间 ${room} 的历史消息数量: ${messages.length}`);
    return messages;
  } catch (error) {
    console.error(`获取房间 ${room} 的历史消息失败: ${error}`);
    throw error;
  }
}

/**
 * 关闭指定房间的数据库连接
 * @param room 房间号
 */
export function closeRoomDB(room: string): void {
  const db = dbConnections.get(room);
  if (db) {
    db.close();
    dbConnections.delete(room);
    console.log(`已关闭房间 ${room} 的数据库连接`);
  }
}

export default dbConnections;

