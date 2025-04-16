import Database from 'better-sqlite3';
import path from 'path';
import config from './config';
import fs from 'fs';
import { Message } from './types';
import { generalLog } from './logger';

// 定义 InsertResult 接口
interface InsertResult {
  id: number;
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
 * 插入一条消息到数据库，并返回时间戳和ID
 * @param room 房间号
 * @param userId 用户ID
 * @param type 消息类型 ('text' | 'image')
 * @param content 消息内容
 * @param clipReg clipReg值(0-5)，仅text类型可能有值
 * @returns {id: number, timestamp: string} 消息ID和服务器记录的时间戳
 */
export function insertMessage(room: string, userId: string, type: 'text' | 'image', content: string, clipReg?: number): {id: number, timestamp: string} {
  try {
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      INSERT INTO messages (userId, type, content, clipReg)
      VALUES (?, ?, ?, ?)
      RETURNING id, timestamp
    `);
    
    // 如果是image类型，确保clipReg为null
    const clipRegValue = type === 'image' ? null : clipReg;
    
    const result = stmt.get(userId, type, content, clipRegValue) as InsertResult;
    
    generalLog(new Date(), `插入消息到房间 ${room} | 用户ID: ${userId} | 类型: ${type} | ID: ${result.id} | 时间戳: ${result.timestamp} | clipReg: ${clipRegValue}`);
    
    if (result && result.timestamp) {
      return { id: result.id, timestamp: result.timestamp };
    } else {
      throw new Error('Failed to retrieve id and timestamp after inserting message');
    }
  } catch (error) {
    generalLog(new Date(), `插入消息失败 | 房间: ${room} | 用户ID: ${userId} | 类型: ${type} | 错误: ${error}`);
    throw error;
  }
}

/**
 * 获取指定房间中ID大于等于给定ID的历史消息
 * @param room 房间号
 * @param fromId 起始消息ID（包含此ID）
 * @returns 消息数组
 */
export function getMessagesFromId(room: string, fromId: number): Message[] {
  try {
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      SELECT id, userId, type, content, timestamp, clipReg
      FROM messages
      WHERE id >= ?
      ORDER BY timestamp ASC
    `);
    
    const messages = stmt.all(fromId) as Message[];
    generalLog(new Date(), `获取房间 ${room} 的历史消息数量: ${messages.length}，起始ID: ${fromId}`);

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

/**
 * 获取指定房间的特定消息
 * @param room 房间号
 * @param messageId 消息ID
 * @returns 消息对象，如果未找到则返回null
 */
export function getMessage(room: string, messageId: number): Message | null {
  try {
    const db = getRoomDB(room);
    const stmt = db.prepare(`
      SELECT id, userId, type, content, timestamp, clipReg
      FROM messages
      WHERE id = ?
    `);
    
    const message = stmt.get(messageId) as Message | null;
    
    if (message) {
      generalLog(new Date(), `获取房间 ${room} 中ID为 ${messageId} 的消息成功`);
    } else {
      generalLog(new Date(), `房间 ${room} 中未找到ID为 ${messageId} 的消息`);
    }
    
    return message;
  } catch (error) {
    generalLog(new Date(), `获取房间 ${room} 中ID为 ${messageId} 的消息失败: ${error}`);
    throw error;
  }
}

export default dbConnections;

