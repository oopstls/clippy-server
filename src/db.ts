import Database from 'better-sqlite3';
import path from 'path';
import config from './config';
import fs from 'fs';
import { Message } from './types';
import { generalLog } from './logger';

// 定义 InsertResult 接口
interface InsertResult {
  timestamp: string;
}

// 确保数据库目录存在
const dbDir = path.join(__dirname, '../', config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  generalLog(new Date(), `已创建数据库目录: ${dbDir}`);
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
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        clipReg INTEGER CHECK(clipReg IS NULL OR (clipReg >= 0 AND clipReg <= 5))
      )
    `).run();
    
    dbConnections.set(room, db);
    generalLog(new Date(), `成功连接到房间 ${room} 的数据库: ${dbPath}`);
    return db;
  } catch (error) {
    generalLog(new Date(), `无法连接到房间 ${room} 的数据库: ${error}`);
    throw error;
  }
}

/**
 * 插入一条消息到数据库，并返回时间戳
 * @param room 房间号
 * @param userId 用户ID
 * @param type 消息类型 ('text' | 'image')
 * @param content 消息内容
 * @param clipReg clipReg值(0-5)，仅text类型可能有值
 * @returns 服务器记录的时间戳
 */
export function insertMessage(room: string, userId: string, type: 'text' | 'image', content: string, clipReg?: number): string {
  try {
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      INSERT INTO messages (userId, type, content, clipReg)
      VALUES (?, ?, ?, ?)
      RETURNING timestamp
    `);
    
    // 如果是image类型，确保clipReg为null
    const clipRegValue = type === 'image' ? null : clipReg;
    
    const result = stmt.get(userId, type, content, clipRegValue) as InsertResult;
    
    generalLog(new Date(), `插入消息到房间 ${room} | 用户ID: ${userId} | 类型: ${type} | 时间戳: ${result.timestamp} | clipReg: ${clipRegValue}`);
    
    if (result && result.timestamp) {
      return result.timestamp;
    } else {
      throw new Error('Failed to retrieve timestamp after inserting message');
    }
  } catch (error) {
    generalLog(new Date(), `插入消息失败 | 房间: ${room} | 用户ID: ${userId} | 类型: ${type} | 错误: ${error}`);
    throw error;
  }
}

/**
 * 获取指定房间的历史消息
 * @param room 房间号
 * @returns 消息数组
 */
export function getMessages(room: string): Message[] {
  try {
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      SELECT userId, type, content, timestamp, clipReg
      FROM messages
      ORDER BY timestamp ASC
    `);
    
    const messages = stmt.all() as Message[];
    generalLog(new Date(), `获取房间 ${room} 的历史消息数量: ${messages.length}`);

    return messages;
  } catch (error) {
    generalLog(new Date(), `获取房间 ${room} 的历史消息失败: ${error}`);
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
    generalLog(new Date(), `已关闭房间 ${room} 的数据库连接`);
  }
}

export default dbConnections;

