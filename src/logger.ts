import fs from 'fs';
import path from 'path';
import config from './config';

// 确保日志目录存在
const logDir = path.join(__dirname, '../', config.log.path);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  generalLog(new Date(), `已创建日志目录: ${logDir}`);
}

/**
 * 日志函数
 * @param direction 消息方向: 'Sent' | 'Received'
 * @param timestamp 消息时间
 * @param room 同步房间 ID
 * @param userId 用户 ID
 * @param messageType 消息类型
 * @param messageContent 消息内容（已经根据类型处理）
 */
export function messageLog(
  timestamp: Date,
  room: string,
  userId: string,
  messageType: string,
): void {
  const isoTimestamp = timestamp.toISOString();

  // 构建日志字符串
  let logContent = `Time: ${isoTimestamp} | Room: ${room} | UserID: ${userId} | Type: ${messageType}\n`;

  // 输出到控制台
  console.log(logContent);

  // 记录到日志文件
  const logFilePath = path.join(__dirname, '../', config.log.path, config.log.file);

  fs.appendFile(logFilePath, logContent, (err) => {
    if (err) {
      console.error(`无法写入日志文件: ${err}`);
    }
  });
}

export function generalLog(
  timestamp: Date,
  info: string,
): void {
  const isoTimestamp = timestamp.toISOString();

  const logContent = `Time: ${isoTimestamp} | Event: ${info}\n`;

  console.log(logContent);

  const logFilePath = path.join(__dirname, '../', config.log.path, config.log.file);

  fs.appendFile(logFilePath, logContent, (err) => {
    if (err) {
      console.error(`无法写入日志文件: ${err}`);
    }
  });
}
